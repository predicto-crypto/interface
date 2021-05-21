import React, { useContext, useState } from "react";
import { Platform, View } from "react-native";

import { ChainId } from "@pancakeswap-libs/sdk-v2";
import AmountMeta from "../components/AmountMeta";
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
import Notice from "../components/Notice";
import Text from "../components/Text";
import Title from "../components/Title";
import TokenInput from "../components/TokenInput";
import WebFooter from "../components/web/WebFooter";
import { StakingSubMenu } from "../components/web/WebSubMenu";
import { IS_DESKTOP, Spacing } from "../constants/dimension";
import { EthersContext } from "../context/EthersContext";
import useStakingState, { StakingState } from "../hooks/useStakingState";
import useTranslation from "../hooks/useTranslation";
import MetamaskError from "../types/MetamaskError";
import { formatBalance, isEmptyValue, parseBalance } from "../utils";
import Screen from "./Screen";

const UnstakeScreen = () => {
    const t = useTranslation();
    return (
        <Screen>
            <Container>
                <BackgroundImage />
                <Content>
                    <Title text={t("unstake")} />
                    <Text light={true}>{t("unstake-desc")}</Text>
                    <Staking />
                </Content>
                {Platform.OS === "web" && <WebFooter />}
            </Container>
            <StakingSubMenu />
        </Screen>
    );
};

const Staking = () => {
    const { chainId } = useContext(EthersContext);
    const t = useTranslation();
    const state = useStakingState();
    if (chainId !== ChainId.MAINNET) return <ChangeNetwork />;
    return (
        <View style={{ marginTop: Spacing.large }}>
            <XSushiBalance state={state} />
            <Border />
            <AmountInput state={state} />
            {state.xPredicto && state.xPredicto.balance.isZero() && (
                <Notice text={t("you-dont-have-xpredicto")} color={"orange"} style={{ marginTop: Spacing.small }} />
            )}
            <UnstakeInfo state={state} />
        </View>
    );
};

const XSushiBalance = ({ state }: { state: StakingState }) => {
    const t = useTranslation();
    return (
        <View>
            <Heading text={t("your-xpredicto")} />
            <AmountMeta
                amount={state.xPredicto ? formatBalance(state.xPredicto.balance, state.xPredicto.decimals) : ""}
                suffix={"xPREDICT"}
            />
        </View>
    );
};

const AmountInput = ({ state }: { state: StakingState }) => {
    const t = useTranslation();
    if (!state.xPredicto || state.xPredicto.balance.isZero()) {
        return <Heading text={t("amount-to-unstake")} disabled={true} />;
    }
    return (
        <View>
            <Heading text={t("amount-to-unstake")} />
            <TokenInput
                token={state.xPredicto}
                amount={state.amount}
                onAmountChanged={state.setAmount}
                autoFocus={IS_DESKTOP}
            />
        </View>
    );
};

const UnstakeInfo = ({ state }: { state: StakingState }) => {
    const disabled =
        !state.predicto ||
        !state.xPredicto ||
        !state.predictoStaked ||
        !state.xPredictoSupply ||
        isEmptyValue(state.amount);
    const predictoAmount = disabled
        ? undefined
        : parseBalance(state.amount, state.xPredicto!.decimals)
              .mul(state.predictoStaked!)
              .div(state.xPredictoSupply!);
    return (
        <InfoBox>
            <AmountMeta
                amount={predictoAmount ? formatBalance(predictoAmount, state.predicto!.decimals, 8) : ""}
                suffix={"PREDICT"}
                disabled={disabled}
            />
            <Controls state={state} />
        </InfoBox>
    );
};

const Controls = ({ state }: { state: StakingState }) => {
    const [error, setError] = useState<MetamaskError>({});
    return (
        <View style={{ marginTop: Spacing.normal }}>
            {!state.xPredicto || state.xPredicto.balance.isZero() || isEmptyValue(state.amount) ? (
                <UnstakeButton state={state} onError={setError} disabled={true} />
            ) : parseBalance(state.amount, state.xPredicto.decimals).gt(state.xPredicto.balance) ? (
                <InsufficientBalanceButton symbol={state.xPredicto.symbol} />
            ) : state.loading ? (
                <FetchingButton />
            ) : (
                <UnstakeButton state={state} onError={setError} disabled={false} />
            )}
            {error.message && error.code !== 4001 && <ErrorMessage error={error} />}
        </View>
    );
};

const UnstakeButton = ({
    state,
    onError,
    disabled
}: {
    state: StakingState;
    onError: (e) => void;
    disabled: boolean;
}) => {
    const t = useTranslation();
    const onPress = async () => {
        onError({});
        try {
            await state.onLeave();
            state.setAmount("");
        } catch (e) {
            onError(e);
        }
    };
    return <Button title={t("unstake")} loading={state.leaving} onPress={onPress} disabled={disabled} />;
};

export default UnstakeScreen;
