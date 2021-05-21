import { ethers } from "ethers";
import Token from "../types/Token";

export const BNB: Token = {
    name: "Binance Coin",
    address: ethers.constants.AddressZero,
    decimals: 18,
    symbol: "BNB",
    logoURI: "https://bscscan.com/token/images/binance_32.png",
    balance: ethers.BigNumber.from(0)
};
