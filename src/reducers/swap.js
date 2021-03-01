const initState = {
  tokens: [],
  pairs: [],
  swapType: 'exactin',
  token1: {},
  token2: {},
  token1Amount: '',
  token2Amount: '',
  isValidPair: false,
  isValidSwap: false,
  bestPath: [],
  showPrice: false,
}

export const swap = (state = initState, action) => {
  switch (action.type) {
    case 'SET_SWAP_TOKENS':
      return { ...state, tokens: action.tokens }
    case 'SET_PAIRS':
      return { ...state, pairs: action.pairs }
    case 'SET_SWAP_TYPE':
      return { ...state, swapType: action.swapType }
    case 'SET_SWAP_TOKEN1':
      return { ...state, token1: action.token1 }
    case 'SET_SWAP_TOKEN2':
      return { ...state, token2: action.token2 }
    case 'SET_TOKEN1_AMOUNT':
      return { ...state, token1Amount: action.token1Amount }
    case 'SET_TOKEN2_AMOUNT':
      return { ...state, token2Amount: action.token2Amount }
    case 'SET_IS_VALID_PAIR':
      return { ...state, isValidPair: action.isValidPair }
    case 'SET_IS_VALID_SWAP':
      return { ...state, isValidSwap: action.isValidSwap }
    case 'SET_SWAP_BEST_PATH':
      return { ...state, bestPath: action.bestPath }
    case 'SET_SWAP_SHOW_RPICE':
      return { ...state, showPrice: action.showPrice }
    default:
      return { ...state }
  }
}
