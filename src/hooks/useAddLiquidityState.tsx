import { useCallback, useContext, useState } from "react";

import { Pair } from "@pancakeswap-libs/sdk-v2";
import { EthersContext } from "../context/EthersContext";
import { convertToken, isBNB, parseBalance } from "../utils";
import useDelayedOnBlockEffect from "./useDelayedOnBlockEffect";
import useSDK from "./useSDK";
import useSwapRouter from "./useSwapRouter";
import useTokenPairState, { TokenPairState } from "./useTokenPairState";

export interface AddLiquidityState extends TokenPairState {
    pair?: Pair;
    priceDetermined: boolean;
    onAdd: () => Promise<void>;
    adding: boolean;
}

// tslint:disable-next-line:max-func-body-length
const useAddLiquidityState: () => AddLiquidityState = () => {
    const state = useTokenPairState();
    const { provider, signer, updateTokens } = useContext(EthersContext);
    const [loading, setLoading] = useState(false);
    const [pair, setPair] = useState<Pair>();
    const [adding, setAdding] = useState(false);
    const { getPair } = useSDK();
    const { addLiquidity, addLiquidityETH } = useSwapRouter();
    const priceDetermined =
        !!pair &&
        !!state.toToken &&
        !pair
            .priceOf(convertToken(state.toToken))
            .denominator.toString()
            .startsWith("0");

    useDelayedOnBlockEffect(
        async block => {
            if (!block) {
                setLoading(true);
                setPair(undefined);
            }
            if (state.fromToken && state.toToken && provider) {
                try {
                    setPair(await getPair(state.fromToken, state.toToken, provider));
                } catch (e) {
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        },
        () => "getPair(" + state.fromSymbol + "," + state.toSymbol + ")",
        [state.fromSymbol, state.toSymbol, provider],
        0
    );

    const onAdd = useCallback(async () => {
        if (state.fromToken && state.toToken && state.fromAmount && state.toAmount && provider && signer) {
            setAdding(true);
            try {
                const fromAmount = parseBalance(state.fromAmount, state.fromToken.decimals);
                const toAmount = parseBalance(state.toAmount, state.toToken.decimals);
                if (isBNB(state.fromToken) || isBNB(state.toToken)) {
                    const [token, amount, amountETH] = isBNB(state.fromToken)
                        ? [state.toToken, toAmount, fromAmount]
                        : [state.fromToken, fromAmount, toAmount];
                    const tx = await addLiquidityETH(token, amount, amountETH, signer);
                    await tx.wait();
                } else {
                    const tx = await addLiquidity(state.fromToken, state.toToken, fromAmount, toAmount, signer);
                    await tx.wait();
                }
                await updateTokens();
                state.setFromSymbol("");
            } finally {
                setAdding(false);
            }
        }
    }, [state.fromToken, state.toToken, state.fromAmount, state.toAmount, provider, signer]);

    return {
        ...state,
        loading: loading || state.loading,
        pair,
        priceDetermined,
        onAdd,
        adding
    };
};

export default useAddLiquidityState;
