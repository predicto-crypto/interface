import React, { useContext, useState } from "react";
import { Platform, View } from "react-native";

import { ChainId } from "@pancakeswap-libs/sdk-v2";
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
import WebFooter from "../components/web/WebFooter";
import { StakingSubMenu } from "../components/web/WebSubMenu";
import { STAKING } from "../constants/contracts";
import { IS_DESKTOP, Spacing } from "../constants/dimension";
import Fraction from "../constants/Fraction";
import { EthersContext } from "../context/EthersContext";
import useStakingState, { StakingState } from "../hooks/useStakingState";
import useTranslation from "../hooks/useTranslation";
import MetamaskError from "../types/MetamaskError";
import { formatBalance, isEmptyValue, parseBalance } from "../utils";
import Screen from "./Screen";

const StakeScreen = () => {
    const t = useTranslation();
    return (
        <Screen>
            <Container>
                <BackgroundImage />
                <Content>
                    <Title text={t("stake")} />
                    <Text light={true}>{t("stake-desc")}</Text>
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
            <SushiBalance state={state} />
            <Border />
            <AmountInput state={state} />
            {state.predicto && state.predicto.balance.isZero() && (
                <Notice text={t("you-dont-have-predicto")} color={"orange"} style={{ marginTop: Spacing.small }} />
            )}
            <StakeInfo state={state} />
        </View>
    );
};

const SushiBalance = ({ state }: { state: StakingState }) => {
    const t = useTranslation();
    return (
        <View>
            <Heading text={t("your-predicto")} />
            <AmountMeta
                amount={state.predicto ? formatBalance(state.predicto.balance, state.predicto.decimals) : ""}
                suffix={"PREDICT"}
            />
        </View>
    );
};

const AmountInput = ({ state }: { state: StakingState }) => {
    const t = useTranslation();
    if (!state.predicto || state.predicto.balance.isZero()) {
        return <Heading text={t("amount-to-stake")} disabled={true} />;
    }
    return (
        <View>
            <Heading text={t("amount-to-stake")} />
            <TokenInput
                token={state.predicto}
                amount={state.amount}
                onAmountChanged={state.setAmount}
                autoFocus={IS_DESKTOP}
            />
        </View>
    );
};

// tslint:disable-next-line:max-func-body-length
const StakeInfo = ({ state }: { state: StakingState }) => {
    const t = useTranslation();
    const disabled =
        !state.predicto ||
        state.predicto.balance.isZero() ||
        !state.xPredicto ||
        !state.predictoStaked ||
        !state.xPredictoSupply ||
        isEmptyValue(state.amount);
    const xPredictoAmount = disabled
        ? undefined
        : parseBalance(state.amount, state.predicto!.decimals)
              .mul(state.xPredictoSupply!)
              .div(state.predictoStaked!);
    const xPredictoTotal = disabled ? undefined : formatBalance(state.xPredictoSupply!, state.xPredicto!.decimals, 8);
    const xPredictoBalance = disabled ? undefined : state.xPredicto!.balance.add(xPredictoAmount!);
    const share = disabled
        ? undefined
        : Fraction.from(xPredictoAmount!.add(xPredictoBalance!), state.xPredictoSupply!).toString();
    return (
        <InfoBox>
            <AmountMeta
                amount={xPredictoAmount ? formatBalance(xPredictoAmount, state.xPredicto!.decimals, 8) : ""}
                suffix={"xPREDICT"}
                disabled={disabled}
            />
            <Meta label={t("xpredicto-share")} text={share} suffix={"%"} disabled={disabled} />
            <Meta label={t("total-xpredicto")} text={xPredictoTotal} disabled={disabled} />
            <Controls state={state} />
        </InfoBox>
    );
};

const Controls = ({ state }: { state: StakingState }) => {
    const [error, setError] = useState<MetamaskError>({});
    return (
        <View style={{ marginTop: Spacing.normal }}>
            {!state.predicto || state.predicto.balance.isZero() || isEmptyValue(state.amount) ? (
                <StakeButton state={state} onError={setError} disabled={true} />
            ) : parseBalance(state.amount, state.predicto.decimals).gt(state.predicto.balance) ? (
                <InsufficientBalanceButton symbol={state.predicto.symbol} />
            ) : state.loading ? (
                <FetchingButton />
            ) : (
                <>
                    <ApproveButton
                        token={state.predicto}
                        spender={STAKING}
                        onSuccess={() => state.setSushiAllowed(true)}
                        onError={setError}
                        hidden={state.predictoAllowed}
                    />
                    <StakeButton state={state} onError={setError} disabled={!state.predictoAllowed} />
                </>
            )}
            {error.message && error.code !== 4001 && <ErrorMessage error={error} />}
        </View>
    );
};

const StakeButton = ({
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
            await state.onEnter();
            state.setAmount("");
        } catch (e) {
            onError(e);
        }
    };
    return <Button title={t("stake")} loading={state.entering} onPress={onPress} disabled={disabled} />;
};

export default StakeScreen;
