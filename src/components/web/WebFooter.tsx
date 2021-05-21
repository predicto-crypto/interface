import React from "react";
import { Image, TouchableHighlight, View } from "react-native";
import { useHistory, useLocation } from "react-router-dom";

import { Spacing } from "../../constants/dimension";
import FlexView from "../FlexView";
import Text from "../Text";

const FLAGS = {
    us: require("../../../assets/flags/us.png"),
    cn: require("../../../assets/flags/cn.png"),
    kr: require("../../../assets/flags/kr.png"),
    fr: require("../../../assets/flags/fr.png"),
    es: require("../../../assets/flags/es.png"),
    jp: require("../../../assets/flags/jp.png")
};

const WebFooter = () => {
    return (
        <View style={{ width: "100%", padding: Spacing.normal, alignItems: "center" }}>
            <FlexView style={{ marginTop: Spacing.small }}>
                <Flag name={"us"} locale={"en"} />
                <Flag name={"es"} locale={"es"} />
                <Flag name={"fr"} locale={"fr"} />
                <Flag name={"cn"} locale={"zh"} />
                <Flag name={"jp"} locale={"jp"} />
                <Flag name={"kr"} locale={"ko"} />
            </FlexView>
            <Text note={true} style={{ marginTop: Spacing.small }}>
                Copyright © 2020 Predicto Ltd.
            </Text>
            <Text note={true}>Copyright © 2020 IntelliQuant Inc.</Text>
        </View>
    );
};

const Flag = ({ name, locale }) => {
    const history = useHistory();
    const location = useLocation();
    const onPress = () => {
        history.push(location.pathname + "?locale=" + locale);
    };
    return (
        <TouchableHighlight onPress={onPress} style={{ marginHorizontal: 4 }}>
            <Image source={FLAGS[name]} style={{ width: 30, height: 20 }} />
        </TouchableHighlight>
    );
};

export default WebFooter;
