import React, { useCallback, useContext, useState } from "react";
import { Platform, View } from "react-native";

import useAsyncEffect from "use-async-effect";
import AmountMeta from "../components/AmountMeta";
import ApproveButton from "../components/ApproveButton";
import BackgroundImage from "../components/BackgroundImage";
import Border from "../components/Border";
import Button from "../components/Button";
import ChangeNetwork from "../components/ChangeNetwork";
import Container from "../components/Container";
import Content from "../components/Content";
import ErrorMessage from "../components/ErrorMessage";
import FetchingButton from "../components/FetchingButton";
import Heading from "../components/Heading";
import InfoBox from "../components/InfoBox";
import InsufficientBalanceButton from "../components/InsufficientBalanceButton";
import Meta from "../components/Meta";
import Notice from "../components/Notice";
import Text from "../components/Text";
import Title from "../components/Title";
import TokenInput from "../components/TokenInput";
import TokenSelect from "../components/TokenSelect";
import UnsupportedButton from "../components/UnsupportedButton";
import WebFooter from "../components/web/WebFooter";
import { SwapSubMenu } from "../components/web/WebSubMenu";
import { ROUTER } from "../constants/contracts";
import { IS_DESKTOP, Spacing } from "../constants/dimension";
import { EthersContext } from "../context/EthersContext";
import useColors from "../hooks/useColors";
import useSwapState, { SwapState } from "../hooks/useSwapState";
import useTranslation from "../hooks/useTranslation";
import MetamaskError from "../types/MetamaskError";
import { isEmptyValue, isBNB, isBNBWBNBPair, isWBNB, parseBalance } from "../utils";
import Screen from "./Screen";
import { ChainId } from "@pancakeswap-libs/sdk-v2";

const SwapScreen = () => {
    const t = useTranslation();
    return (
        <Screen>
            <Container>
                <BackgroundImage />
                <Content>
                    <Title text={t("new-order")} />
                    <Text light={true}>{t("new-order-desc")}</Text>
                    <Swap />
                </Content>
                {Platform.OS === "web" && <WebFooter />}
            </Container>
            <SwapSubMenu />
        </Screen>
    );
};

const Swap = () => {
    const { chainId } = useContext(EthersContext);
    const state = useSwapState();
    if (chainId !== ChainId.MAINNET && chainId !== 42) return <ChangeNetwork />;
    return (
        <View style={{ marginTop: Spacing.large }}>
            <FromTokenSelect state={state} />
            <Border />
            <ToTokenSelect state={state} />
            <Border />
            <AmountInput state={state} />
            {!state.loading && !state.trade && <NoPairNotice state={state} />}
            <TradeInfo state={state} />
        </View>
    );
};

const FromTokenSelect = ({ state }: { state: SwapState }) => {
    const t = useTranslation();
    return (
        <View>
            <TokenSelect
                title={t("token-to-sell")}
                symbol={state.fromSymbol}
                onChangeSymbol={state.setFromSymbol}
                // hidden={token => token.balance.isZero()}
            />
        </View>
    );
};

const ToTokenSelect = ({ state }: { state: SwapState }) => {
    const t = useTranslation();
    if (!state.fromSymbol) {
        return <Heading text={t("token-to-buy")} disabled={true} />;
    }
    return (
        <View>
            <TokenSelect
                title={t("token-to-buy")}
                symbol={state.toSymbol}
                onChangeSymbol={state.setToSymbol}
                hidden={token => token.symbol === state.fromSymbol}
            />
            {!state.toSymbol && <LimitOrderUnsupportedNotice />}
        </View>
    );
};

const AmountInput = ({ state }: { state: SwapState }) => {
    const t = useTranslation();
    if (!state.fromSymbol || !state.toSymbol) {
        return <Heading text={t("amount")} disabled={true} />;
    }
    return (
        <View>
            <Heading text={state.fromSymbol + " " + t("amount")} />
            <TokenInput
                token={state.fromToken}
                amount={state.fromAmount}
                onAmountChanged={state.setFromAmount}
                autoFocus={IS_DESKTOP}
            />
        </View>
    );
};

const LimitOrderUnsupportedNotice = () => {
    const { placeholder } = useColors();
    const t = useTranslation();
    return (
        <Notice
            text={t("eth-not-supported-for-limit-orders")}
            color={placeholder}
            clear={true}
            style={{ marginVertical: Spacing.small, marginHorizontal: Spacing.tiny }}
        />
    );
};

const NoPairNotice = ({ state }: { state: SwapState }) => {
    const t = useTranslation();
    return (
        <Notice
            text={t("pair-not-created", { fromSymbol: state.fromSymbol, toSymbol: state.toSymbol })}
            color={"red"}
            style={{ marginTop: Spacing.normal }}
        />
    );
};

const TradeInfo = ({ state }: { state: SwapState }) => {
    if (isBNBWBNBPair(state.fromToken, state.toToken)) return <WrapInfo state={state} />;
    const disabled =
        state.fromSymbol === "" ||
        state.toSymbol === "" ||
        isEmptyValue(state.fromAmount) ||
        isBNB(state.fromToken) ||
        (!state.loading && !state.trade);
    return (
        <InfoBox>
            <SwapInfo state={state} disabled={disabled} />
        </InfoBox>
    );
};

const WrapInfo = ({ state }: { state: SwapState }) => {
    const disabled = isEmptyValue(state.fromAmount);
    return (
        <InfoBox>
            <Text style={{ fontSize: 28, marginBottom: Spacing.normal }} disabled={disabled}>
                {disabled ? "N/A" : state.fromAmount + " " + state.toSymbol}
            </Text>
            <SwapControls state={state} />
        </InfoBox>
    );
};

const SwapInfo = ({ state, disabled }: { state: SwapState; disabled: boolean }) => {
    const t = useTranslation();
    const amount = state.trade?.outputAmount?.toFixed();
    const price = state.trade?.executionPrice?.toFixed();
    const impact = state.trade?.priceImpact?.toFixed(2);
    return (
        <View>
            <AmountMeta amount={amount} suffix={state.toSymbol} disabled={disabled} />
            <Meta
                label={t("price")}
                text={price}
                suffix={state.toSymbol + "  = 1 " + state.fromSymbol}
                disabled={disabled}
            />
            <Meta label={t("price-impact")} text={impact} suffix={"%"} disabled={disabled} />
            <Meta label={t("fee-amount")} text={state.swapFee} suffix={state.fromSymbol} disabled={disabled} />
            <SwapControls state={state} />
        </View>
    );
};

// tslint:disable-next-line:max-func-body-length
const SwapControls = ({ state }: { state: SwapState }) => {
    const [error, setError] = useState<MetamaskError>({});
    useAsyncEffect(() => setError({}), [state.fromSymbol, state.toSymbol, state.fromAmount]);
    const approveRequired = !isBNB(state.fromToken) && !state.fromTokenAllowed;
    return (
        <View style={{ marginTop: Spacing.normal }}>
            {!state.fromToken ||
            !state.toToken ||
            isEmptyValue(state.fromAmount) ||
            (!state.loading && !state.trade) ? (
                <SwapButton state={state} onError={setError} disabled={true} />
            ) : parseBalance(state.fromAmount, state.fromToken.decimals).gt(state.fromToken.balance) ? (
                <InsufficientBalanceButton symbol={state.fromSymbol} />
            ) : isWBNB(state.fromToken) && isBNB(state.toToken) ? (
                <UnwrapButton state={state} onError={setError} />
            ) : isBNB(state.fromToken) && isWBNB(state.toToken) ? (
                <WrapButton state={state} onError={setError} />
            ) : state.unsupported ? (
                <UnsupportedButton state={state} />
            ) : state.loading || !state.trade ? (
                <FetchingButton />
            ) : (
                <>
                    <ApproveButton
                        token={state.fromToken}
                        spender={ROUTER}
                        onSuccess={() => state.setFromTokenAllowed(true)}
                        onError={setError}
                        hidden={!approveRequired}
                    />
                    <SwapButton state={state} onError={setError} disabled={approveRequired} />
                </>
            )}
            {error.message && error.code !== 4001 && <ErrorMessage error={error} />}
        </View>
    );
};

const SwapButton = ({ state, onError, disabled }: { state: SwapState; onError: (e) => void; disabled: boolean }) => {
    const t = useTranslation();
    const onPress = useCallback(() => {
        onError({});
        state.onSwap().catch(onError);
    }, [state.onSwap, onError]);
    return (
        <Button
            title={t("swap-", {
                symbol: state.fromSymbol && state.toSymbol ? " " + state.fromSymbol + "-" + state.toSymbol : ""
            })}
            disabled={disabled}
            loading={state.swapping}
            onPress={onPress}
        />
    );
};

const WrapButton = ({ state, onError }: { state: SwapState; onError: (e) => void }) => {
    const t = useTranslation();
    const onPress = useCallback(async () => {
        onError({});
        state.onWrap().catch(onError);
    }, []);
    return <Button title={t("wrap")} loading={state.wrapping} onPress={onPress} />;
};

const UnwrapButton = ({ state, onError }: { state: SwapState; onError: (e) => void }) => {
    const t = useTranslation();
    const onPress = useCallback(async () => {
        onError({});
        state.onUnwrap().catch(onError);
    }, []);
    return <Button title={t("unwrap")} loading={state.unwrapping} onPress={onPress} />;
};

export default SwapScreen;
