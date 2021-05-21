import ERC20 from "@predicto-crypto/contracts/abi/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json";
import IPancakeFactory from "@predicto-crypto/contracts/abi/contracts/interfaces/IPancakeFactory.sol/IPancakeFactory.json";
import IPancakePair from "@predicto-crypto/contracts/abi/contracts/interfaces/IPancakePair.sol/IPancakePair.json";
import MasterChef from "@predicto-crypto/contracts/abi/contracts/MasterChef.sol/MasterChef.json";
import IPancakeRouter02 from "@predicto-crypto/contracts/abi/contracts/mock/PancakeRouter.sol/IPancakeRouter02.json";
import WBNB from "@predicto-crypto/contracts/abi/contracts/mock/WBNB.sol/WBNB.json";
import PredictoStaking from "@predicto-crypto/contracts/abi/contracts/PredictoStaking.sol/PredictoStaking.json";
import { ethers } from "ethers";
import TokenScanner from "../constants/abi/TokenScanner.json";

const CONTRACTS = {
    ERC20,
    IPancakeFactory,
    IPancakePair,
    IPancakeRouter02,
    WBNB,
    MasterChef,
    PredictoStaking,
    TokenScanner
};

const getContract = (name: string, address: string, signerOrProvider: ethers.Signer | ethers.providers.Provider) => {
    const abi = CONTRACTS[name];
    return new ethers.Contract(address, abi, signerOrProvider);
};

export default getContract;
