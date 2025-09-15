import * as yup from 'yup'
import { User } from '../models/main/User'
import { logger } from '../logger'
import { generateToken } from './authentication'
import { ethers } from 'ethers'
import { LOGIN_MESSAGE } from '../config'

// // Schema for login request validation
// export const loginSchema = yup.object({
//   message: yup.string()
//     .required()
//     .min(1, 'Message cannot be empty'),
//   signature: yup.string()
//     .required()
//     .matches(/^0x[0-9a-fA-F]{130}$/, 'Invalid signature format')
// }).required()

// export const handleLogin = async (_: string | null, request: yup.InferType<typeof loginSchema>) => {
//   try {
//     // Recover wallet address from signature
//     let walletAddress
//     try {
//       walletAddress = ethers.verifyMessage(request.message, request.signature).toLowerCase()

//       // Verify message matches expected format
//       if (request.message !== `${LOGIN_MESSAGE}${walletAddress}`) {
//         logger.error({message: 'Invalid login message', request: {
//           message: request.message,
//           signature: request.signature,
//           walletAddress: walletAddress
//         }})
//         return {
//           response: 'Invalid login message',
//           error: true,
//           status: 401
//         }
//       }
//     } catch (error) {
//       logger.error({ message: 'Signature verification error', error })
//       return {
//         response: 'Invalid signature',
//         error: true,
//         status: 401
//       }
//     }

//     // Find or create user with the recovered wallet address
//     const [user, created] = await User.findOrCreate({
//       where: { wallet_address: walletAddress },
//       defaults: {
//         login_message: request.message,
//         login_signature: request.signature
//       }
//     })

//     // If user exists, update last_active
//     if (!created) {
//       await user.update({
//         last_active: new Date()
//       })
//     }

//     const token = generateToken(user)

//     return {
//       response: {
//         uuid: user.uuid,
//         walletAddress: walletAddress,
//         token
//       },
//       status: 200
//     }

//   } catch (error) {
//     logger.error({ message: 'Login error', error })
//     return {
//       response: 'Error processing login',
//       error: true,
//       status: 500
//     }
//   }
// }
