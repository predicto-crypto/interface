import { ethers } from "ethers";
import { FACTORY, MASTER_CHEF, TOKEN_SCANNER } from "../constants/contracts";
import { BNB } from "../constants/tokens";
import LPToken from "../types/LPToken";
import Token from "../types/Token";
import { getContract } from "./index";

const POOL_IDS = [0, 1];

export const fetchTokens = async (account: string, provider: ethers.providers.JsonRpcProvider) => {
    const response = await fetch("/tokens.json");
    const json = await response.json();
    const tokens = [...json.tokens];

    const balances = await fetchTokenBalances(
        account,
        tokens.map(token => token.address),
        provider
    );
    return [
        {
            ...BNB,
            balance: await provider.getBalance(account)
        },
        ...tokens.map((token, i) => ({
            ...token,
            balance: ethers.BigNumber.from(balances[i] || 0)
        }))
    ];
};

// tslint:disable-next-line:max-func-body-length
export const fetchPools = async (account: string, tokens: Token[], provider: ethers.providers.JsonRpcProvider) => {
    return (await Promise.all(POOL_IDS.map(poolId => fetchPool(poolId, account, tokens, provider)))).filter(
        pool => !!pool
    ) as LPToken[];
};

export const fetchMyPools = async (account: string, tokens: Token[], provider: ethers.providers.JsonRpcProvider) => {
    const fetchMyPool = async (poolId): Promise<LPToken | null> => {
        try {
            const myStake = await fetchMyStake(poolId, account, provider);
            if (myStake.amountDeposited.isZero()) return null;
            const pool = await fetchPool(poolId, account, tokens, provider);
            if (!pool) return null;
            return {
                ...pool,
                amountDeposited: myStake.amountDeposited,
                pendingPredicto: myStake.pendingPredicto
            };
        } catch (e) {
            return null;
        }
    };
    return (await Promise.all(POOL_IDS.map(fetchMyPool))).filter(pool => !!pool) as LPToken[];
};

// tslint:disable-next-line:max-func-body-length
const fetchPool = async (poolId, account, tokens, provider): Promise<LPToken | null> => {
    try {
        const masterChef = getContract("MasterChef", MASTER_CHEF, provider);
        const [address, allocPoint] = await masterChef.poolInfo(poolId);
        const pair = await findOrFetchToken(address, provider, tokens);
        const erc20 = getContract("ERC20", address, provider);
        const result = await Promise.all([
            erc20.balanceOf(account),
            erc20.totalSupply(),
            fetchPairTokens(address, tokens, provider)
        ]);
        return {
            ...pair,
            id: poolId,
            address,
            decimals: 18,
            tokenA: result[2].tokenA,
            tokenB: result[2].tokenB,
            symbol: result[2].tokenA.symbol + "-" + result[2].tokenB.symbol + " LP",
            balance: result[0],
            totalSupply: result[1],
            multiplier: allocPoint.toNumber()
        };
    } catch (e) {
        return null;
    }
};

const fetchMyStake = async (poolId: number, account: string, provider: ethers.providers.JsonRpcProvider) => {
    const masterChef = getContract("MasterChef", MASTER_CHEF, provider);
    const { amount: amountDeposited } = await masterChef.userInfo(poolId, account);
    const pendingPredicto = await masterChef.pendingPredicto(poolId, account);
    return { amountDeposited, pendingPredicto };
};

const fetchPairTokens = async (pair: string, tokens: Token[], provider: ethers.providers.JsonRpcProvider) => {
    const contract = getContract("IPancakePair", pair, provider);
    const tokenA = await findOrFetchToken(await contract.token0(), provider, tokens);
    const tokenB = await findOrFetchToken(await contract.token1(), provider, tokens);
    return { tokenA, tokenB };
};

export const fetchMyLPTokens = async (account: string, tokens: Token[], provider: ethers.providers.JsonRpcProvider) => {
    return await fetchLPTokens(FACTORY, account, tokens, provider);
};

const LP_TOKENS_LIMIT = 100;

// tslint:disable-next-line:max-func-body-length
const fetchLPTokens = async (
    factory: string,
    account: string,
    tokens: Token[],
    provider: ethers.providers.JsonRpcProvider
) => {
    const factoryContract = getContract("IPancakeFactory", factory, provider);
    const length = await factoryContract.allPairsLength();
    const scanner = getContract("TokenScanner", TOKEN_SCANNER, provider);
    const pages: number[] = [];
    for (let i = 0; i < length; i += LP_TOKENS_LIMIT) pages.push(i);
    const pairs = (
        await Promise.all(
            pages.map(page =>
                scanner.findPairs(account, factory, page, Math.min(page + LP_TOKENS_LIMIT, length.toNumber()))
            )
        )
    ).flat();
    const balances = await fetchTokenBalances(
        account,
        pairs.map(pair => pair.token),
        provider
    );
    return await Promise.all(
        pairs.map(async (pair, index) => {
            const erc20 = getContract("ERC20", pair.token, provider);
            const result = await Promise.all([
                erc20.decimals(),
                erc20.totalSupply(),
                fetchPairTokens(pair.token, tokens, provider)
            ]);
            return {
                address: pair.token,
                decimals: Number(result[0]),
                name: result[2].tokenA.symbol + "-" + result[2].tokenB.symbol + " LP Token",
                symbol: result[2].tokenA.symbol + "-" + result[2].tokenB.symbol,
                balance: ethers.BigNumber.from(balances[index]),
                totalSupply: result[1],
                tokenA: result[2].tokenA,
                tokenB: result[2].tokenB
            } as LPToken;
        })
    );
};

export const findOrFetchToken = async (
    address: string,
    provider: ethers.providers.JsonRpcProvider,
    tokens?: Token[]
) => {
    if (tokens) {
        const token = tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
        if (token) {
            return token;
        }
    }
    const meta = await fetchTokenMeta(address, provider);
    return {
        address,
        name: meta.name,
        symbol: meta.symbol,
        decimals: meta.decimals,
        logoURI: "",
        balance: ethers.constants.Zero
    } as Token;
};

const fetchTokenMeta = async (address: string, provider: ethers.providers.JsonRpcProvider) => {
    const erc20 = getContract("ERC20", address, provider);
    const data = await Promise.all(
        ["name", "symbol", "decimals"].map(field => {
            try {
                return erc20.callStatic[field]();
            } catch (e) {
                return "";
            }
        })
    );
    return {
        name: data[0],
        symbol: data[1],
        decimals: data[2],
        logoURI: ""
    };
};

const fetchTokenBalances = async (account: string, addresses: string[], provider: ethers.providers.JsonRpcProvider) => {
    return await Promise.all(
        addresses.map(async address => {
            const erc20 = getContract("ERC20", address, provider);
            return await erc20.balanceOf(account);
        })
    );
};
