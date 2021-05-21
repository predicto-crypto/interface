import React, { useCallback, useContext, useState } from "react";
import { Platform, View } from "react-native";

import { ChainId, TokenAmount } from "@pancakeswap-libs/sdk-v2";
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
import ItemSeparator from "../components/ItemSeparator";
import Meta from "../components/Meta";
import Notice from "../components/Notice";
import Text from "../components/Text";
import Title from "../components/Title";
import TokenInput from "../components/TokenInput";
import TokenSelect from "../components/TokenSelect";
import UnsupportedButton from "../components/UnsupportedButton";
import WebFooter from "../components/web/WebFooter";
import { LiquiditySubMenu } from "../components/web/WebSubMenu";
import { ROUTER } from "../constants/contracts";
import { Spacing } from "../constants/dimension";
import Fraction from "../constants/Fraction";
import { EthersContext } from "../context/EthersContext";
import useAddLiquidityState, { AddLiquidityState } from "../hooks/useAddLiquidityState";
import useColors from "../hooks/useColors";
import useLinker from "../hooks/useLinker";
import useSDK from "../hooks/useSDK";
import useTranslation from "../hooks/useTranslation";
import MetamaskError from "../types/MetamaskError";
import { convertAmount, convertToken, formatBalance, isBNB, isBNBWBNBPair, isEmptyValue, parseBalance } from "../utils";
import Screen from "./Screen";

const LiquidityScreen = () => {
    const t = useTranslation();
    return (
        <Screen>
            <Container>
                <BackgroundImage />
                <Content>
                    <Title text={t("add-liquidity")} />
                    <Text light={true}>{t("add-liquidity-desc")}</Text>
                    <AddLiquidity />
                </Content>
                {Platform.OS === "web" && <WebFooter />}
            </Container>
            <LiquiditySubMenu />
        </Screen>
    );
};

const AddLiquidity = () => {
    const { chainId } = useContext(EthersContext);
    const state = useAddLiquidityState();
    if (chainId !== ChainId.MAINNET) return <ChangeNetwork />;
    return (
        <View style={{ marginTop: Spacing.large }}>
            <FromTokenSelect state={state} />
            <Border />
            <ToTokenSelect state={state} />
            <Border />
            <FromTokenInput state={state} />
            <>
                <ItemSeparator />
                <ToTokenInput state={state} />
            </>
            <PriceInfo state={state} />
        </View>
    );
};

const FromTokenSelect = ({ state }: { state: AddLiquidityState }) => {
    const t = useTranslation();
    return <TokenSelect title={t("1st-token")} symbol={state.fromSymbol} onChangeSymbol={state.setFromSymbol} />;
};

const ToTokenSelect = ({ state }: { state: AddLiquidityState }) => {
    const t = useTranslation();
    if (!state.fromSymbol) {
        return <Heading text={t("2nd-token")} disabled={true} />;
    }
    return (
        <View>
            <TokenSelect
                title={t("2nd-token")}
                symbol={state.toSymbol}
                onChangeSymbol={state.setToSymbol}
                hidden={token => token.symbol === state.fromSymbol}
            />
        </View>
    );
};

const FromTokenInput = ({ state }: { state: AddLiquidityState }) => {
    const t = useTranslation();
    if (!state.fromSymbol || !state.toSymbol) {
        return <Heading text={t("amount-of-tokens")} disabled={true} />;
    }
    const onAmountChanged = (newAmount: string) => {
        state.setFromAmount(newAmount);
        if (state.pair && state.fromToken && state.priceDetermined) {
            console.log(state.pair.liquidityToken.address);
            const fromPrice = state.pair.priceOf(convertToken(state.fromToken));
            const toAmount = fromPrice.quote(convertAmount(state.fromToken, newAmount)).toExact();
            state.setToAmount(isEmptyValue(toAmount) ? "" : toAmount);
        }
    };
    return (
        <TokenInput
            title={t("amount-of-tokens")}
            token={state.fromToken}
            amount={state.fromAmount}
            onAmountChanged={onAmountChanged}
            hideMaxButton={state.loading && !state.pair}
        />
    );
};

const ToTokenInput = ({ state }: { state: AddLiquidityState }) => {
    if (!state.fromSymbol || !state.toSymbol) return <View />;
    const onAmountChanged = (newAmount: string) => {
        state.setToAmount(newAmount);
        if (state.pair && state.toToken && state.priceDetermined) {
            const toPrice = state.pair.priceOf(convertToken(state.toToken));
            const fromAmount = toPrice.quote(convertAmount(state.toToken, newAmount)).toExact();
            state.setFromAmount(isEmptyValue(fromAmount) ? "" : fromAmount);
        }
    };
    return (
        <TokenInput
            token={state.toToken}
            amount={state.toAmount}
            onAmountChanged={onAmountChanged}
            hideMaxButton={state.loading && !state.pair}
        />
    );
};

const PriceInfo = ({ state }: { state: AddLiquidityState }) => {
    if (state.fromToken && state.toToken && !state.loading && (!state.pair || !state.priceDetermined)) {
        return <FirstProviderInfo state={state} />;
    } else {
        return <PairPriceInfo state={state} />;
    }
};

const FirstProviderInfo = ({ state }: { state: AddLiquidityState }) => {
    const t = useTranslation();
    const { green } = useColors();
    const noAmount = isEmptyValue(state.fromAmount) || isEmptyValue(state.toAmount);
    const initialPrice = Fraction.from(
        parseBalance(state.toAmount, state.toToken!.decimals),
        parseBalance(state.fromAmount, state.fromToken!.decimals)
    ).toString(8);
    return (
        <View>
            <InfoBox style={{ marginTop: Spacing.normal }}>
                <PriceMeta state={state} price={initialPrice} disabled={noAmount} />
                <FirstProviderControls state={state} />
            </InfoBox>
            {!isBNBWBNBPair(state.fromToken, state.toToken) && (
                <Notice
                    text={t("first-provider-desc-1") + t("first-provider-desc-2")}
                    color={green}
                    style={{ marginTop: Spacing.small }}
                />
            )}
        </View>
    );
};

// tslint:disable-next-line:max-func-body-length
const FirstProviderControls = ({ state }: { state: AddLiquidityState }) => {
    const [error, setError] = useState<MetamaskError>({});
    useAsyncEffect(() => setError({}), [state.fromSymbol, state.toSymbol, state.fromAmount]);
    const fromApproveRequired = !isBNB(state.fromToken) && !state.fromTokenAllowed;
    const toApproveRequired = !isBNB(state.toToken) && !state.toTokenAllowed;
    const disabled =
        fromApproveRequired || isEmptyValue(state.fromAmount) || toApproveRequired || isEmptyValue(state.toAmount);
    return (
        <View style={{ marginTop: Spacing.normal }}>
            {isBNBWBNBPair(state.fromToken, state.toToken) ? (
                <UnsupportedButton state={state} />
            ) : !state.fromToken || !state.toToken || isEmptyValue(state.fromAmount) || isEmptyValue(state.toAmount) ? (
                <SupplyButton state={state} onError={setError} disabled={true} />
            ) : state.loading ? (
                <FetchingButton />
            ) : parseBalance(state.fromAmount, state.fromToken.decimals).gt(state.fromToken.balance) ? (
                <InsufficientBalanceButton symbol={state.fromSymbol} />
            ) : parseBalance(state.toAmount, state.toToken.decimals).gt(state.toToken.balance) ? (
                <InsufficientBalanceButton symbol={state.toSymbol} />
            ) : (
                <>
                    <ApproveButton
                        token={state.fromToken}
                        spender={ROUTER}
                        onSuccess={() => state.setFromTokenAllowed(true)}
                        onError={setError}
                        hidden={!fromApproveRequired}
                    />
                    <ApproveButton
                        token={state.toToken}
                        spender={ROUTER}
                        onSuccess={() => state.setToTokenAllowed(true)}
                        onError={setError}
                        hidden={!toApproveRequired}
                    />
                    <SupplyButton state={state} onError={setError} disabled={disabled} />
                </>
            )}
            {error.message && error.code !== 4001 && <ErrorMessage error={error} />}
        </View>
    );
};

const PairPriceInfo = ({ state }: { state: AddLiquidityState }) => {
    const t = useTranslation();
    const { fromAmount, toAmount, lpTokenAmount } = useAmountCalculator(state);
    const disabled = isEmptyValue(state.fromAmount) || isEmptyValue(state.toAmount);
    const price =
        state.pair && state.fromToken && state.priceDetermined
            ? state.pair.priceOf(convertToken(state.fromToken)).toFixed(8)
            : undefined;
    const symbol = state.fromSymbol + "-" + state.toSymbol;
    return (
        <InfoBox>
            <AmountMeta amount={lpTokenAmount} suffix={symbol} disabled={disabled} />
            <Meta text={fromAmount?.toFixed()} label={state.fromSymbol || t("1st-token")} disabled={disabled} />
            <Meta text={toAmount?.toFixed()} label={state.toSymbol || t("2nd-token")} disabled={disabled} />
            <PriceMeta state={state} price={price} disabled={!state.fromSymbol || !state.toSymbol} />
            <Controls state={state} />
        </InfoBox>
    );
};

const useAmountCalculator = (state: AddLiquidityState) => {
    const [amount, setAmount] = useState<string>();
    const [fromAmount, setFromAmount] = useState<TokenAmount>();
    const [toAmount, setToAmount] = useState<TokenAmount>();
    const { calculateAmountOfLPTokenMinted } = useSDK();
    useAsyncEffect(async () => {
        if (
            state.fromToken &&
            state.toToken &&
            state.pair &&
            !isEmptyValue(state.fromAmount) &&
            !isEmptyValue(state.toAmount)
        ) {
            const from = new TokenAmount(
                convertToken(state.fromToken),
                parseBalance(state.fromAmount, state.fromToken.decimals)
                    .div(1)
                    .toString()
            );
            setFromAmount(from);
            const to = convertAmount(state.toToken, state.toAmount);
            setToAmount(to);
            const minted = await calculateAmountOfLPTokenMinted(state.pair, from, to);
            setAmount(minted ? formatBalance(minted, state.pair.liquidityToken.decimals) : undefined);
        }
    }, [state.pair, state.fromAmount, state.toAmount]);
    return { fromAmount, toAmount, lpTokenAmount: amount };
};

const PriceMeta = ({ state, price, disabled }) => {
    const t = useTranslation();
    return (
        <Meta
            label={t("ratio")}
            text={price}
            suffix={state.toSymbol + " = 1 " + state.fromSymbol}
            disabled={disabled}
        />
    );
};

// tslint:disable-next-line:max-func-body-length
const Controls = ({ state }: { state: AddLiquidityState }) => {
    const [error, setError] = useState<MetamaskError>({});
    useAsyncEffect(() => setError({}), [state.fromSymbol, state.toSymbol, state.fromAmount]);
    const fromApproveRequired = !isBNB(state.fromToken) && !state.fromTokenAllowed;
    const toApproveRequired = !isBNB(state.toToken) && !state.toTokenAllowed;
    const disabled =
        fromApproveRequired || isEmptyValue(state.fromAmount) || toApproveRequired || isEmptyValue(state.toAmount);
    return (
        <View style={{ marginTop: Spacing.normal }}>
            {!state.fromToken || !state.toToken || isEmptyValue(state.fromAmount) || isEmptyValue(state.toAmount) ? (
                <SupplyButton state={state} onError={setError} disabled={true} />
            ) : state.loading || !state.pair ? (
                <FetchingButton />
            ) : isBNBWBNBPair(state.fromToken, state.toToken) ? (
                <UnsupportedButton state={state} />
            ) : parseBalance(state.fromAmount, state.fromToken.decimals).gt(state.fromToken.balance) ? (
                <InsufficientBalanceButton symbol={state.fromSymbol} />
            ) : parseBalance(state.toAmount, state.toToken.decimals).gt(state.toToken.balance) ? (
                <InsufficientBalanceButton symbol={state.toSymbol} />
            ) : (
                <>
                    <ApproveButton
                        token={state.fromToken}
                        spender={ROUTER}
                        onSuccess={() => state.setFromTokenAllowed(true)}
                        onError={setError}
                        hidden={!fromApproveRequired}
                    />
                    <ApproveButton
                        token={state.toToken}
                        spender={ROUTER}
                        onSuccess={() => state.setToTokenAllowed(true)}
                        onError={setError}
                        hidden={!toApproveRequired}
                    />
                    <SupplyButton state={state} onError={setError} disabled={disabled} />
                </>
            )}
            {error.message && error.code !== 4001 && <ErrorMessage error={error} />}
        </View>
    );
};

const SupplyButton = ({
    state,
    onError,
    disabled
}: {
    state: AddLiquidityState;
    onError: (e) => void;
    disabled: boolean;
}) => {
    const t = useTranslation();
    const goToRemoveLiquidity = useLinker("/liquidity/remove", "RemoveLiquidity");
    const onPress = useCallback(async () => {
        onError({});
        try {
            await state.onAdd();
            goToRemoveLiquidity();
        } catch (e) {
            onError(e);
        }
    }, [state.onAdd, onError]);
    return (
        <Button
            title={t("supply-", {
                symbol: state.fromSymbol && state.toSymbol ? " " + state.fromSymbol + "-" + state.toSymbol : ""
            })}
            disabled={disabled}
            loading={state.adding}
            onPress={onPress}
        />
    );
};

export default LiquidityScreen;
