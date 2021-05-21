import { useCallback } from "react";

import { ethers } from "ethers";
import { STAKING } from "../constants/contracts";
import { getContract } from "../utils";

const useStaking = () => {
    const enter = useCallback(async (amount: ethers.BigNumber, signer: ethers.Signer) => {
        const staking = getContract("PredictoStaking", STAKING, signer);
        const gasLimit = await staking.estimateGas.enter(amount);
        return await staking.enter(amount, {
            gasLimit: gasLimit.mul(120).div(100)
        });
    }, []);

    const leave = useCallback(async (amount: ethers.BigNumber, signer: ethers.Signer) => {
        const staking = getContract("PredictoStaking", STAKING, signer);
        const gasLimit = await staking.estimateGas.leave(amount);
        return await staking.leave(amount, {
            gasLimit: gasLimit.mul(120).div(100)
        });
    }, []);

    return {
        enter,
        leave
    };
};

export default useStaking;
