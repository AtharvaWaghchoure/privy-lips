import { HardhatUserConfig } from 'hardhat/config'
import '@nomiclabs/hardhat-ethers'
import '@nomicfoundation/hardhat-chai-matchers'
import '@nomicfoundation/hardhat-network-helpers'
import '@nomicfoundation/hardhat-verify'
import '@typechain/hardhat'
import '@typechain/ethers-v5'
import * as dotenv from 'dotenv'
import './tasks'

dotenv.config()

const config: HardhatUserConfig = {
	solidity: {
		version: '0.8.25',
		settings: {
			optimizer: {
				enabled: true,
				runs: 200,
			},
		},
	},
	defaultNetwork: 'hardhat',
	networks: {
		// Mantle Sepolia - Primary chain for Privy-Lips
		'mantle-sepolia': {
			url: process.env.MANTLE_SEPOLIA_RPC || 'https://rpc.sepolia.mantle.xyz',
			accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
			chainId: 5003,
			gasPrice: 20000000, // 0.02 gwei as recommended by Mantle docs
		},

		// Mantle Mainnet (for future production)
		'mantle': {
			url: process.env.MANTLE_RPC || 'https://rpc.mantle.xyz',
			accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
			chainId: 5000,
		},

		// Ethereum Sepolia - for testing
		'eth-sepolia': {
			url: process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com',
			accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
			chainId: 11155111,
			gasMultiplier: 1.2,
		},
	},

	etherscan: {
		apiKey: {
			'mantle-sepolia': process.env.MANTLESCAN_API_KEY || '',
			'mantle': process.env.MANTLESCAN_API_KEY || '',
			'eth-sepolia': process.env.ETHERSCAN_API_KEY || '',
		},
		customChains: [
			{
				network: 'mantle-sepolia',
				chainId: 5003,
				urls: {
					apiURL: 'https://api-sepolia.mantlescan.xyz/api',
					browserURL: 'https://sepolia.mantlescan.xyz',
				},
			},
			{
				network: 'mantle',
				chainId: 5000,
				urls: {
					apiURL: 'https://api.mantlescan.xyz/api',
					browserURL: 'https://mantlescan.xyz',
				},
			},
		],
	},
}

export default config

