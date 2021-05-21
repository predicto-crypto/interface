import { useCallback, useContext, useState } from "react";

import { Trade } from "@pancakeswap-libs/sdk-v2";
import { EthersContext } from "../context/EthersContext";
import { formatBalance, isEmptyValue, parseBalance } from "../utils";
import useDelayedEffect from "./useDelayedEffect";
import useDelayedOnBlockEffect from "./useDelayedOnBlockEffect";
import useSDK from "./useSDK";
import useSwapRouter from "./useSwapRouter";
import useTokenPairState, { TokenPairState } from "./useTokenPairState";
import useAsyncEffect from "use-async-effect";

export interface SwapState extends TokenPairState {
    trade?: Trade;
    unsupported: boolean;
    swapFee: string;
    onSwap: () => Promise<void>;
    swapping: boolean;
}

// tslint:disable-next-line:max-func-body-length
const useSwapState: () => SwapState = () => {
    const state = useTokenPairState();
    const { chainId, provider, signer, updateTokens } = useContext(EthersContext);
    const { getTrade } = useSDK();
    const { swap, calculateSwapFee } = useSwapRouter();
    const [loading, setLoading] = useState(true);
    const [trade, setTrade] = useState<Trade>();
    const [unsupported, setUnsupported] = useState(false);
    const [swapFee, setSwapFee] = useState("");
    const [swapping, setSwapping] = useState(false);

    useDelayedEffect(
        () => {
            if (isEmptyValue(state.fromAmount)) {
                setTrade(undefined);
            }
        },
        300,
        [state.fromAmount]
    );

    useDelayedOnBlockEffect(
        async block => {
            if (!block) {
                setLoading(true);
            }
            if (state.fromToken && state.toToken && state.fromAmount && provider) {
                const amount = parseBalance(state.fromAmount, state.fromToken.decimals);
                if (!amount.isZero()) {
                    setUnsupported(false);
                    try {
                        setTrade(await getTrade(state.fromToken, state.toToken, amount, provider));
                    } catch (e) {
                        setUnsupported(true);
                    } finally {
                        setLoading(false);
                    }
                }
            }
        },
        () => "getTrade(" + state.fromSymbol + "," + state.toSymbol + "," + state.fromAmount + ")",
        [chainId, provider, state.fromToken, state.toToken, state.fromAmount]
    );

    useAsyncEffect(() => {
        if (trade && !isEmptyValue(state.fromAmount)) {
            const fromAmount = parseBalance(state.fromAmount, state.fromToken!.decimals);
            setSwapFee(formatBalance(calculateSwapFee(fromAmount), state.fromToken!.decimals, 8));
        }
    }, [trade, state.fromAmount]);

    const onSwap = useCallback(async () => {
        if (state.fromToken && state.toToken && state.fromAmount && signer && trade) {
            setSwapping(true);
            try {
                const result = await swap(trade, signer);
                if (result) {
                    await result.tx.wait();
                    await updateTokens();
                    setTrade(undefined);
                }
            } finally {
                setSwapping(false);
            }
        }
    }, [state.fromToken, state.toToken, state.fromAmount, signer, trade]);

    return {
        ...state,
        loading: loading || state.loading,
        trade,
        unsupported,
        swapFee,
        onSwap,
        swapping
    };
};

export default useSwapState;
