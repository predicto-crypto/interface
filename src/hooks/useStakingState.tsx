import { useCallback, useContext, useEffect, useMemo, useState } from "react";

import { ethers } from "ethers";
import useAsyncEffect from "use-async-effect";
import { STAKING } from "../constants/contracts";
import { EthersContext } from "../context/EthersContext";
import Token from "../types/Token";
import { getContract, parseBalance } from "../utils";
import useStaking from "./useStaking";

export interface StakingState {
    predicto?: Token;
    xPredicto?: Token;
    predictoStaked?: ethers.BigNumber;
    predictoSupply?: ethers.BigNumber;
    xPredictoSupply?: ethers.BigNumber;
    amount: string;
    setAmount: (amount: string) => void;
    predictoAllowed: boolean;
    setSushiAllowed: (allowed: boolean) => void;
    xPredictoAllowed: boolean;
    setXSushiAllowed: (allowed: boolean) => void;
    loading: boolean;
    onEnter: () => Promise<void>;
    entering: boolean;
    onLeave: () => Promise<void>;
    leaving: boolean;
}

// tslint:disable-next-line:max-func-body-length
const useStakingState: () => StakingState = () => {
    const { signer, address, getTokenAllowance, tokens, updateTokens } = useContext(EthersContext);
    const { enter, leave } = useStaking();
    const [predictoStaked, setSushiStaked] = useState<ethers.BigNumber>();
    const [predictoSupply, setSushiSupply] = useState<ethers.BigNumber>();
    const [xPredictoSupply, setXSushiSupply] = useState<ethers.BigNumber>();
    const [amount, setAmount] = useState("");
    const [predictoAllowed, setSushiAllowed] = useState(false);
    const [xPredictoAllowed, setXSushiAllowed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [entering, setEntering] = useState(false);
    const [leaving, setLeaving] = useState(false);

    const predicto = useMemo(() => tokens.find(token => token.symbol === "PREDICT"), [tokens]);
    const xPredicto = useMemo(() => tokens.find(token => token.symbol === "xPREDICT"), [tokens]);

    useEffect(() => {
        setAmount("");
    }, [address]);

    useAsyncEffect(async () => {
        if (predicto && xPredicto && signer) {
            setSushiAllowed(false);
            setXSushiAllowed(false);
            setLoading(true);
            try {
                const minAllowance = ethers.BigNumber.from(2)
                    .pow(96)
                    .sub(1);
                const predictoAllowance = await getTokenAllowance(predicto.address, STAKING);
                setSushiAllowed(ethers.BigNumber.from(predictoAllowance).gte(minAllowance));
                const xPredictoAllowance = await getTokenAllowance(xPredicto.address, STAKING);
                setXSushiAllowed(ethers.BigNumber.from(xPredictoAllowance).gte(minAllowance));

                const predictoContract = getContract("ERC20", predicto.address, signer);
                setSushiStaked(await predictoContract.balanceOf(STAKING));
                setSushiSupply(await predictoContract.totalSupply());
                const xPredictoContract = getContract("ERC20", xPredicto.address, signer);
                setXSushiSupply(await xPredictoContract.totalSupply());
            } finally {
                setLoading(false);
            }
        }
    }, [predicto, xPredicto, signer]);

    const onEnter = useCallback(async () => {
        if (amount && predicto && signer) {
            setEntering(true);
            try {
                const parsed = parseBalance(amount, predicto.decimals);
                const tx = await enter(parsed, signer);
                if (tx) {
                    await tx.wait();
                    await updateTokens();
                    setAmount("");
                }
            } finally {
                setEntering(false);
            }
        }
    }, [amount, predicto, signer]);

    const onLeave = useCallback(async () => {
        if (amount && xPredicto && signer) {
            setLeaving(true);
            try {
                const parsed = parseBalance(amount, xPredicto.decimals);
                const tx = await leave(parsed, signer);
                if (tx) {
                    await tx.wait();
                    await updateTokens();
                    setAmount("");
                }
            } finally {
                setLeaving(false);
            }
        }
    }, [amount, xPredicto, signer]);

    return {
        predicto,
        xPredicto,
        predictoStaked,
        predictoSupply,
        xPredictoSupply,
        amount,
        setAmount,
        predictoAllowed,
        setSushiAllowed,
        xPredictoAllowed,
        setXSushiAllowed,
        loading,
        onEnter,
        entering,
        onLeave,
        leaving
    };
};

export default useStakingState;
