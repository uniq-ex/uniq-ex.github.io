import { combineReducers } from 'redux'
import { modal } from './modal'
import { wallet } from './wallet'
import { common } from './common'
import { gov } from './gov'
import { swap } from './swap'
import { staking } from './staking'
import { synth } from './synth'
import { trade } from './trade'
import { pool } from './pool'

const reducers = combineReducers({
  modal,
  wallet,
  common,
  gov,
  swap,
  staking,
  synth,
  trade,
  pool
})

export default reducers