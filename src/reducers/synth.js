const initState = {
  stat: {},
  marketStat: {},
  availableReward: 0,
  synthType: 'mint',
  unxToken: {},
  unxPrice: 0
}

export const synth = (state = initState, action) => {
  switch (action.type) {
    case 'SET_SYNTH_STAT':
      return { ...state, stat: action.stat }
    case 'SET_SYNTH_MARKET_STAT':
      return { ...state, marketStat: action.marketStat }
    case 'SET_SYNTH_AVAILABLE_REWARD':
      return { ...state, availableReward: action.availableReward }
    case 'SET_SYNTH_TYPE':
      return { ...state, synthType: action.synthType }
    case 'SET_SYNTH_UNX_TOKEN':
      return { ...state, unxToken: action.unxToken }
    case 'SET_SYNTH_UNX_PRICE':
      return { ...state, unxPrice: action.unxPrice }
    default:
      return { ...state }
  }
}
