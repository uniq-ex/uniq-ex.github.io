import { combineReducers } from 'redux'
import { modal } from './modal'
import { wallet } from './wallet'
import { common } from './common'
import { gov } from './gov'
import { swap } from './swap'

const reducers = combineReducers({
  modal,
  wallet,
  common,
  gov,
  swap
})

export default reducers