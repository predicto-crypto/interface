import React, { FC, useContext } from "react";
import { Image, TouchableHighlight, View } from "react-native";
import { Icon } from "react-native-elements";
import { Link, useRouteMatch } from "react-router-dom";

import { HEADER_HEIGHT, HEADER_WIDTH, IS_DESKTOP, Spacing } from "../../constants/dimension";
import { EthersContext } from "../../context/EthersContext";
import useColors from "../../hooks/useColors";
import useTranslation from "../../hooks/useTranslation";
import FlexView from "../FlexView";
import Text from "../Text";
import useLinker from "../../hooks/useLinker";
import { ChainId } from "@pancakeswap-libs/sdk-v2";

export interface WebHeaderProps {
    onExpandMenu?: () => void;
}

const WebHeader: FC<WebHeaderProps> = props => {
    const { header, borderDark } = useColors();
    return (
        <View
            // @ts-ignore
            style={{
                position: "fixed",
                top: 0,
                zIndex: 100,
                width: "100%",
                height: HEADER_HEIGHT,
                paddingBottom: Spacing.small,
                backgroundColor: header,
                borderBottomWidth: 1,
                borderColor: borderDark
            }}>
            <FlexView
                style={{
                    flex: 1,
                    width: IS_DESKTOP ? HEADER_WIDTH : "100%",
                    alignSelf: "center",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    paddingTop: Spacing.small,
                    paddingHorizontal: Spacing.normal
                }}>
                <Title />
                {IS_DESKTOP ? <Menu /> : <MenuIcon onExpand={props.onExpandMenu} />}
            </FlexView>
        </View>
    );
};

export const Title = () => {
    return (
        <View style={{ alignSelf: "center" }}>
            <Link to={"/"} style={{ textDecoration: "none" }}>
                <Image
                    source={require("../../../assets/logo.png")}
                    style={{ width: 160, height: 36, marginTop: 8, marginLeft: -16 }}
                />
            </Link>
        </View>
    );
};

const Menu = () => {
    const t = useTranslation();
    return (
        <FlexView
            style={{
                height: "100%",
                alignItems: "center"
            }}>
            <MenuItem title={t("menu.swap")} path={"/swap"} />
            <MenuItem title={t("menu.liquidity")} path={"/liquidity"} />
            <MenuItem title={t("menu.stake")} path={"/staking"} />
            <MenuItem title={t("menu.farm")} path={"/farming"} />
            {/*<DarkModeSwitch style={{ marginLeft: Spacing.small }} />*/}
            <Status />
        </FlexView>
    );
};

const MenuItem = ({ title, path }) => {
    const { textDark, textLight } = useColors();
    const match = useRouteMatch(path);
    const active = (path === "/" ? match?.isExact : true) && match?.path?.startsWith(path);
    return (
        <Link to={path} style={{ marginLeft: Spacing.tiny, textDecoration: "none" }}>
            <MenuText color={active ? textDark : textLight} title={title} onPress={undefined} />
        </Link>
    );
};

const MenuText = ({ color, title, onPress }) => {
    return (
        <Text
            onPress={onPress}
            style={{
                fontFamily: "regular",
                fontSize: 18,
                color,
                padding: 3
            }}>
            {title}
        </Text>
    );
};

const MenuIcon = ({ onExpand }) => {
    const { textDark } = useColors();
    return <Icon type={"material-community"} name={"menu"} size={28} color={textDark} onPress={onExpand} />;
};

const Status = () => {
    const t = useTranslation();
    const { textLight, green, borderDark } = useColors();
    const { ethereum, chainId, address } = useContext(EthersContext);
    const title = !!address
        ? address!.substring(0, 6) + "..." + address!.substring(address!.length - 4, address!.length)
        : t("menu.not-connected");
    const color = chainId === ChainId.MAINNET ? green : chainId === 42 ? "#8A2BE2" : textLight;
    const onPress = () => {
        if (confirm(t("do-you-want-to-disconnect"))) ethereum?.disconnect?.();
    };
    return (
        <TouchableHighlight onPress={onPress} disabled={!ethereum?.isWalletConnect}>
            <FlexView
                style={{
                    height: 28,
                    justifyContent: "center",
                    alignItems: "center",
                    marginLeft: Spacing.small,
                    paddingHorizontal: Spacing.small,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: borderDark
                }}>
                <View style={{ backgroundColor: color, width: 6, height: 6, borderRadius: 3, marginRight: 12 }} />
                <Text style={{ fontSize: 15, color: textLight, marginRight: 2 }}>{title}</Text>
                {ethereum?.isWalletConnect && <CloseIcon />}
            </FlexView>
        </TouchableHighlight>
    );
};

const CloseIcon = () => {
    const { textLight } = useColors();
    return (
        <Icon
            type={"material-community"}
            name={"close"}
            size={15}
            color={textLight}
            style={{ paddingLeft: 2, paddingTop: 2 }}
        />
    );
};

export default WebHeader;
