import React from "react";
import { View, ViewStyle } from "react-native";

import useColors from "../hooks/useColors";

const BackgroundImage = ({ style }: { style?: ViewStyle }) => {
    const { background } = useColors();
    const props = {
        width: 1920,
        height: 1920
    };
    return (
        <View
            style={[
                {
                    position: "absolute",
                    width: "100%",
                    aspectRatio: 1,
                    backgroundColor: background
                },
                style
            ]}>
            <View {...props} style={{ marginTop: -400, marginLeft: -1000, alignSelf: "center" }} />
        </View>
    );
};

export default BackgroundImage;
