import React, { useCallback, useContext, useMemo, useState } from "react";
import { Platform, View } from "react-native";

import { ChainId } from "@pancakeswap-libs/sdk-v2";
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
import LPTokenSelect, { LPTokenItem } from "../components/LPTokenSelect";
import Meta from "../components/Meta";
import Text from "../components/Text";
import Title from "../components/Title";
import TokenInput from "../components/TokenInput";
import WebFooter from "../components/web/WebFooter";
import { LiquiditySubMenu } from "../components/web/WebSubMenu";
import { ROUTER } from "../constants/contracts";
import { Spacing } from "../constants/dimension";
import { EthersContext } from "../context/EthersContext";
import useRemoveLiquidityState, { RemoveLiquidityState } from "../hooks/useRemoveLiquidityState";
import { FEE } from "../hooks/useSwapRouter";
import useTranslation from "../hooks/useTranslation";
import MetamaskError from "../types/MetamaskError";
import { deduct, formatBalance, isEmptyValue, parseBalance } from "../utils";
import Screen from "./Screen";

const RemoveLiquidityScreen = () => {
    const t = useTranslation();
    return (
        <Screen>
            <Container>
                <BackgroundImage />
                <Content>
                    <Title text={t("remove-liquidity")} />
                    <Text light={true}>{t("remove-liquidity-desc")}</Text>
                    <RemoveLiquidity />
                </Content>
                {Platform.OS === "web" && <WebFooter />}
            </Container>
            <LiquiditySubMenu />
        </Screen>
    );
};

const RemoveLiquidity = () => {
    const { chainId } = useContext(EthersContext);
    const t = useTranslation();
    const state = useRemoveLiquidityState();
    if (chainId !== ChainId.MAINNET) return <ChangeNetwork />;
    return (
        <View style={{ marginTop: Spacing.large }}>
            <LPTokenSelect
                state={state}
                title={t("your-liquidity")}
                emptyText={t("you-dont-have-liquidity")}
                Item={LPTokenItem}
            />
            <Border />
            <AmountInput state={state} />
            <AmountInfo state={state} />
        </View>
    );
};

const AmountInput = ({ state }: { state: RemoveLiquidityState }) => {
    const t = useTranslation();
    if (!state.selectedLPToken) {
        return <Heading text={t("amount-of-tokens")} disabled={true} />;
    }
    return (
        <TokenInput
            title={t("amount-of-tokens")}
            token={state.selectedLPToken}
            amount={state.amount}
            onAmountChanged={state.setAmount}
        />
    );
};

const AmountInfo = ({ state }: { state: RemoveLiquidityState }) => {
    const t = useTranslation();
    const disabled = !state.selectedLPToken || !state.fromToken || !state.toToken;
    const outputAmount = useMemo(() => {
        if (state.fromToken && state.outputToken === state.fromToken) {
            const amount = parseBalance(state.fromAmount, state.fromToken.decimals);
            return formatBalance(amount.add(deduct(amount, FEE)), state.fromToken.decimals);
        } else if (state.toToken && state.outputToken === state.toToken) {
            const amount = parseBalance(state.toAmount, state.toToken.decimals);
            return formatBalance(amount.add(deduct(amount, FEE)), state.toToken.decimals);
        }
    }, [state.outputToken, state.fromToken, state.toToken, state.fromAmount, state.toAmount]);
    return (
        <InfoBox>
            {(state.outputToken === state.fromToken || state.outputToken === state.toToken) && (
                <AmountMeta amount={outputAmount} suffix={state.outputToken?.symbol} disabled={disabled} />
            )}
            <Meta
                label={state.fromToken ? state.fromToken.symbol : t("1st-token")}
                text={state.fromAmount}
                disabled={disabled}
            />
            <Meta
                label={state.toToken ? state.toToken.symbol : t("2nd-token")}
                text={state.toAmount}
                disabled={disabled}
            />
            <Controls state={state} />
        </InfoBox>
    );
};

// tslint:disable-next-line:max-func-body-length
const Controls = ({ state }: { state: RemoveLiquidityState }) => {
    const [error, setError] = useState<MetamaskError>({});
    useAsyncEffect(() => setError({}), [state.fromSymbol, state.toSymbol, state.fromAmount]);
    const approveRequired = !state.selectedLPTokenAllowed;
    const disabled = approveRequired || isEmptyValue(state.amount);
    return (
        <View style={{ marginTop: Spacing.normal }}>
            {!state.selectedLPToken || isEmptyValue(state.amount) ? (
                <RemoveButton state={state} onError={setError} disabled={true} />
            ) : parseBalance(state.amount, state.selectedLPToken.decimals).gt(state.selectedLPToken.balance) ? (
                <InsufficientBalanceButton symbol={state.selectedLPToken.symbol} />
            ) : state.loading || !state.pair ? (
                <FetchingButton />
            ) : (
                <>
                    <ApproveButton
                        token={state.selectedLPToken}
                        spender={ROUTER}
                        onSuccess={() => state.setSelectedLPTokenAllowed(true)}
                        onError={setError}
                        hidden={!approveRequired}
                    />
                    <RemoveButton state={state} onError={setError} disabled={disabled} />
                </>
            )}
            {error.message && error.code !== 4001 && <ErrorMessage error={error} />}
        </View>
    );
};

const RemoveButton = ({
    state,
    onError,
    disabled
}: {
    state: RemoveLiquidityState;
    onError: (e) => void;
    disabled: boolean;
}) => {
    const t = useTranslation();
    const onPress = useCallback(() => {
        onError({});
        state.onRemove().catch(onError);
    }, [state.onRemove, onError]);
    return <Button title={t("remove-liquidity")} disabled={disabled} loading={state.removing} onPress={onPress} />;
};

export default RemoveLiquidityScreen;
