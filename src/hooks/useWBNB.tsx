import { useCallback } from "react";

import { ChainId, WETH } from "@pancakeswap-libs/sdk-v2";
import { ethers } from "ethers";
import { getContract } from "../utils";

const useWBNB = () => {
    const wrapBNB = useCallback(async (amount: ethers.BigNumber, signer: ethers.Signer) => {
        const weth = getContract("WBNB", WETH[ChainId.MAINNET].address, signer);
        const gasLimit = await weth.estimateGas.deposit({
            value: amount
        });
        return await weth.deposit({
            value: amount,
            gasLimit
        });
    }, []);

    const unwrapBNB = useCallback(async (amount: ethers.BigNumber, signer: ethers.Signer) => {
        const weth = getContract("WBNB", WETH[ChainId.MAINNET].address, signer);
        const gasLimit = await weth.estimateGas.withdraw(amount);
        return await weth.withdraw(amount, {
            gasLimit
        });
    }, []);

    return {
        wrapBNB,
        unwrapBNB
    };
};

export default useWBNB;
