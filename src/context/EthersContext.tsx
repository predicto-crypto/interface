import React, { useCallback, useEffect, useState } from "react";

import { ethers } from "ethers";
import useAsyncEffect from "use-async-effect";
import { BNB } from "../constants/tokens";
import Ethereum from "../types/Ethereum";
import TokenWithValue from "../types/TokenWithValue";
import { getContract } from "../utils";
import { fetchTokens } from "../utils/fetch-utils";
import { ChainId } from "@pancakeswap-libs/sdk-v2";

export type OnBlockListener = (block?: number) => void | Promise<void>;

export const EthersContext = React.createContext({
    ethereum: undefined as Ethereum | undefined,
    setEthereum: (_ethereum: Ethereum | undefined) => {},
    provider: undefined as ethers.providers.JsonRpcProvider | undefined,
    signer: undefined as ethers.providers.JsonRpcSigner | undefined,
    chainId: 0,
    address: null as string | null,
    addOnBlockListener: (_name: string, _listener: OnBlockListener) => {},
    removeOnBlockListener: (_name: string) => {},
    tokens: [BNB] as TokenWithValue[],
    updateTokens: async () => {},
    loadingTokens: false,
    approveToken: async (_token: string, _spender: string, _amount?: ethers.BigNumber) => {
        return {} as ethers.providers.TransactionResponse | undefined;
    },
    getTokenAllowance: async (_token: string, _spender: string) => {
        return ethers.constants.Zero as ethers.BigNumber | undefined;
    },
    getTokenBalance: async (_token: string, _who: string) => {
        return ethers.constants.Zero as ethers.BigNumber | undefined;
    },
    getTotalSupply: async (_token: string) => {
        return ethers.constants.Zero as ethers.BigNumber | undefined;
    }
});

// tslint:disable-next-line:max-func-body-length
export const EthersContextProvider = ({ children }) => {
    const [ethereum, setEthereum] = useState<Ethereum | undefined>(window.ethereum);
    const [provider, setProvider] = useState<ethers.providers.JsonRpcProvider>();
    const [signer, setSigner] = useState<ethers.providers.JsonRpcSigner>();
    const [chainId, setChainId] = useState<number>(1);
    const [address, setAddress] = useState<string | null>(null);
    const [onBlockListeners, setOnBlockListeners] = useState<{ [name: string]: OnBlockListener }>({});
    const [tokens, setTokens] = useState<TokenWithValue[]>([]);
    const [loadingTokens, setLoadingTokens] = useState(true);

    useAsyncEffect(async () => {
        // Mainnet
        if (ethereum) {
            const web3 = new ethers.providers.Web3Provider(ethereum);
            const web3Signer = await web3.getSigner();
            setProvider(web3Signer.provider);
            setSigner(web3Signer);
        }
    }, [ethereum, chainId]);

    useEffect(() => {
        if (ethereum) {
            const onAccountsChanged = async () => {
                const accounts = await ethereum.request({ method: "eth_accounts" });
                if (accounts?.[0]) {
                    setAddress(accounts[0]);
                } else {
                    setAddress(null);
                }
            };
            const onChainChanged = async () => {
                setChainId(Number(await ethereum.request({ method: "eth_chainId" })));
            };
            const onDisconnect = () => {
                setAddress(null);
                setEthereum(undefined);
            };
            onAccountsChanged();
            onChainChanged();
            ethereum.on("accountsChanged", onAccountsChanged);
            ethereum.on("chainChanged", onChainChanged);
            ethereum.on("disconnect", onDisconnect);
            return () => {
                ethereum.off("accountsChanged", onAccountsChanged);
                ethereum.off("chainChanged", onAccountsChanged);
                ethereum.off("disconnect", onDisconnect);
            };
        }
    }, [ethereum]);

    const updateTokens = async () => {
        if (address && chainId && provider) {
            try {
                setTokens(await fetchTokens(address, provider));
            } finally {
                setLoadingTokens(false);
            }
        }
    };

    useAsyncEffect(async () => {
        if (address && chainId) {
            setLoadingTokens(true);
            await updateTokens();
        }
    }, [address, chainId]);

    const approveToken = useCallback(
        async (token: string, spender: string, amount?: ethers.BigNumber) => {
            if (signer) {
                amount = amount || ethers.constants.MaxUint256;
                const erc20 = getContract("ERC20", token, signer);
                const gasLimit = await erc20.estimateGas.approve(spender, amount);
                return await erc20.approve(spender, amount, {
                    gasLimit
                });
            }
        },
        [signer]
    );

    const getTokenAllowance = useCallback(
        async (token: string, spender: string) => {
            if (provider && address) {
                const erc20 = getContract("ERC20", token, provider);
                return erc20.allowance(address, spender);
            }
        },
        [provider, address]
    );

    const getTokenBalance = useCallback(
        async (token: string, who: string) => {
            if (provider) {
                const erc20 = getContract("ERC20", token, provider);
                return await erc20.balanceOf(who);
            }
        },
        [provider]
    );

    const getTotalSupply = useCallback(
        async (token: string) => {
            if (provider) {
                const erc20 = getContract("ERC20", token, provider);
                return await erc20.totalSupply();
            }
        },
        [provider]
    );

    const addOnBlockListener = useCallback(
        (name, listener) => {
            setOnBlockListeners(old => ({ ...old, [name]: listener }));
        },
        [setOnBlockListeners]
    );

    const removeOnBlockListener = useCallback(
        name => {
            setOnBlockListeners(old => {
                delete old[name];
                return old;
            });
        },
        [setOnBlockListeners]
    );

    useEffect(() => {
        if (provider && chainId === ChainId.MAINNET) {
            const onBlock = async (block: number) => {
                for (const listener of Object.entries(onBlockListeners)) {
                    await listener[1]?.(block);
                }
            };
            provider.on("block", onBlock);
            return () => {
                provider.off("block", onBlock);
            };
        }
    }, [provider, chainId, onBlockListeners]);

    return (
        <EthersContext.Provider
            value={{
                ethereum,
                setEthereum,
                provider,
                signer,
                chainId,
                address,
                tokens,
                updateTokens,
                loadingTokens,
                approveToken,
                getTokenAllowance,
                getTokenBalance,
                getTotalSupply,
                addOnBlockListener,
                removeOnBlockListener
            }}>
            {children}
        </EthersContext.Provider>
    );
};

export const EthersContextConsumer = EthersContext.Consumer;
