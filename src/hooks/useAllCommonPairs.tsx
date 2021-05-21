import { useCallback } from "react";

import { ChainId, Currency, ETHER, Fetcher, Pair, Token, WETH } from "@pancakeswap-libs/sdk-v2";
import { ethers } from "ethers";

export const CAKE = new Token(
    ChainId.MAINNET,
    "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
    18,
    "CAKE",
    "PancakeSwap Token"
);
export const WBNB = new Token(ChainId.MAINNET, "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", 18, "WBNB", "Wrapped BNB");
export const DAI = new Token(
    ChainId.MAINNET,
    "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3",
    18,
    "DAI",
    "Dai Stablecoin"
);
export const BUSD = new Token(ChainId.MAINNET, "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", 18, "BUSD", "Binance USD");
export const BTCB = new Token(ChainId.MAINNET, "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", 18, "BTCB", "Binance BTC");
export const USDT = new Token(ChainId.MAINNET, "0x55d398326f99059fF775485246999027B3197955", 18, "USDT", "Tether USD");
export const UST = new Token(
    ChainId.MAINNET,
    "0x23396cF899Ca06c4472205fC903bDB4de249D6fC",
    18,
    "UST",
    "Wrapped UST Token"
);
export const ETH = new Token(
    ChainId.MAINNET,
    "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
    18,
    "ETH",
    "Binance-Peg Ethereum Token"
);
const BASES_TO_CHECK_TRADES_AGAINST = [WETH[ChainId.MAINNET], DAI, BUSD, BTCB, USDT, UST, ETH];
const CUSTOM_BASES = {};

function wrappedCurrency(currency: Currency | undefined): Token | undefined {
    return currency === ETHER ? WETH[ChainId.MAINNET] : currency instanceof Token ? currency : undefined;
}

// Source: https://github.com/Uniswap/uniswap-interface/blob/master/src/hooks/Trades.ts
const useAllCommonPairs = () => {
    const loadAllCommonPairs = useCallback(
        // tslint:disable-next-line:max-func-body-length
        async (currencyA?: Currency, currencyB?: Currency, provider?: ethers.providers.BaseProvider) => {
            const bases: Token[] = BASES_TO_CHECK_TRADES_AGAINST;
            const [tokenA, tokenB] = [wrappedCurrency(currencyA), wrappedCurrency(currencyB)];
            const basePairs: [Token, Token][] = bases
                .flatMap((base): [Token, Token][] => bases.map(otherBase => [base, otherBase]))
                .filter(([t0, t1]) => t0.address !== t1.address);

            const allPairCombinations =
                tokenA && tokenB
                    ? [
                          // the direct pair
                          [tokenA, tokenB],
                          // token A against all bases
                          ...bases.map((base): [Token, Token] => [tokenA, base]),
                          // token B against all bases
                          ...bases.map((base): [Token, Token] => [tokenB, base]),
                          // each base against all bases
                          ...basePairs
                      ]
                          .filter((tokens): tokens is [Token, Token] => Boolean(tokens[0] && tokens[1]))
                          .filter(([t0, t1]) => t0.address !== t1.address)
                          .filter(([a, b]) => {
                              const customBases = CUSTOM_BASES;
                              if (!customBases) return true;

                              const customBasesA: Token[] | undefined = customBases[a.address];
                              const customBasesB: Token[] | undefined = customBases[b.address];

                              if (!customBasesA && !customBasesB) return true;

                              if (customBasesA && !customBasesA.find(base => tokenB.equals(base))) return false;
                              return !(customBasesB && !customBasesB.find(base => tokenA.equals(base)));
                          })
                    : [];

            const pairs = await Promise.all(
                allPairCombinations.map(async pair => {
                    try {
                        return await Fetcher.fetchPairData(pair[0], pair[1], provider);
                    } catch (e) {
                        return null;
                    }
                })
            );
            return pairs.filter(pair => pair !== null) as Pair[];
        },
        []
    );

    return { loadAllCommonPairs };
};

export default useAllCommonPairs;
