const initState = {
  makes: [],
  myMakes: [],
  pairs: [],
  tradeType: 'buy',
  tokenPair: {},
  makeView: 'all',
  pool: [],
  lastPrice: 0,
  feeRate: 0,
  isValid: false,
  tokenBalance: '-',
  price: '',
  amount: '',
  total: ''
}

export const trade = (state = initState, action) => {
  switch (action.type) {
    case 'SET_TRADE_MAKES':
      return { ...state, makes: action.makes }
    case 'SET_TRADE_MY_MAKES':
      return { ...state, myMakes: action.myMakes }
    case 'SET_TRADE_PAIRS':
      return { ...state, pairs: action.pairs }
    case 'SET_TRADE_TYPE':
      return { ...state, tradeType: action.tradeType }
    case 'SET_TRADE_TOKEN_PAIR':
      return { ...state, tokenPair: action.tokenPair }
    case 'SET_TRADE_MAKE_VIEW':
      return { ...state, makeView: action.makeView }
    case 'SET_TRADE_POOL':
      return { ...state, pool: action.pool }
    case 'SET_TRADE_LAST_PRICE':
      return { ...state, lastPrice: action.lastPrice }
    case 'SET_TRADE_FEE_RATE': 
      return { ...state, feeRate: action.feeRate }
    case 'SET_TRADE_IS_VALID': 
      return { ...state, isValid: action.isValid }
    case 'SET_TRADE_TOKEN_BALANCE': 
      return { ...state, tokenBalance: action.tokenBalance }
    case 'SET_TRADE_PRICE': 
      return { ...state, price: action.price }
    case 'SET_TRADE_AMOUNT': 
      return { ...state, amount: action.amount }
    case 'SET_TRADE_TOTAL': 
      return { ...state, total: action.total }
    default:
      return { ...state }
  }
}
