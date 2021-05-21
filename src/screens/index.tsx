import React, { lazy, Suspense, useContext, useEffect, useState } from "react";
import { View } from "react-native";
import { HashRouter as Router, Redirect, Route, Switch } from "react-router-dom";

import useAsyncEffect from "use-async-effect";
import MobileWebMenu from "../components/web/MobileWebMenu";
import WebHeader from "../components/web/WebHeader";
import { IS_DESKTOP } from "../constants/dimension";
import { EthersContext } from "../context/EthersContext";
import { GlobalContext } from "../context/GlobalContext";
import useColors from "../hooks/useColors";
import EmptyScreen from "./EmptyScreen";

const FarmingScreen = lazy(() => import("./FarmingScreen"));
const HarvestScreen = lazy(() => import("./HarvestScreen"));
const LiquidityScreen = lazy(() => import("./LiquidityScreen"));
const RemoveLiquidityScreen = lazy(() => import("./RemoveLiquidityScreen"));
const StakeScreen = lazy(() => import("./StakeScreen"));
const UnstakeScreen = lazy(() => import("./UnstakeScreen"));
const SwapScreen = lazy(() => import("./SwapScreen"));

export const Screens = () => {
    const { load } = useContext(GlobalContext);
    useAsyncEffect(load, []);
    return <WebScreens />;
};

// tslint:disable-next-line:max-func-body-length
const WebScreens = () => {
    const { address } = useContext(EthersContext);
    const [menuExpanded, setMenuExpanded] = useState(false);
    const { background } = useColors();
    useEffect(() => {
        if (!address) setMenuExpanded(false);
    }, [address]);
    return (
        <Router>
            <View style={{ flex: 1, backgroundColor: background }}>
                <Suspense fallback={<EmptyScreen />}>
                    <Switch>
                        <Route path={"/swap"}>
                            <SwapScreen />
                        </Route>
                        <Route path={"/liquidity/remove"}>
                            <RemoveLiquidityScreen />
                        </Route>
                        <Route path={"/liquidity"}>
                            <LiquidityScreen />
                        </Route>
                        <Route path={"/farming/harvest"}>
                            <HarvestScreen />
                        </Route>
                        <Route path={"/farming"}>
                            <FarmingScreen />
                        </Route>
                        <Route path={"/staking/unstake"}>
                            <UnstakeScreen />
                        </Route>
                        <Route path={"/staking"}>
                            <StakeScreen />
                        </Route>
                        <Redirect to={"/swap"} />
                    </Switch>
                </Suspense>
                <WebHeader onExpandMenu={() => setMenuExpanded(true)} />
                {!IS_DESKTOP && <MobileWebMenu expanded={menuExpanded} onCollapse={() => setMenuExpanded(false)} />}
            </View>
        </Router>
    );
};
