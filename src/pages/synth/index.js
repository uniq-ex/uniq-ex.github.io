import { client } from '@ont-dev/ontology-dapi'
import React, { useState, useEffect, useCallback } from 'react'
import { utils } from 'ontology-ts-sdk'
import BigNumber from 'bignumber.js'
import { useAlert } from 'react-alert'
import { useMappedState, useDispatch } from 'redux-react-hook'
import { useTranslation } from 'react-i18next'
import Tooltip from 'rc-tooltip';
import TokenInput from '../../components/tokenInput';
import Input from '../../components/input'
import { cyanoRequest } from '../../utils/cyano'
import EventRequest from '../../utils/eventRequest'
import { readBigNumberUint128 } from '../../utils/token'
import { DAI_PRICE, SYNTH_PRICE_DECIMALS, ASSET_STATUS, LEVERAGE_TYPE, TRANSACTION_FEE_RATE } from '../../utils/constants'
import { TRANSACTION_BASE_URL, TRANSACTION_AFTERFIX } from '../../config'
import { useFetchPairs } from '../../hooks/usePair'
import './index.css'

const { StringReader, reverseHex } = utils

const Synth = () => {
  const [mintAsset, setMintAsset] = useState({})
  const [mintAmount, setMintAmount] = useState('')
  const [unxNeededForMint, setUnxNeededForMint] = useState('')
  const [burnAsset, setBurnAsset] = useState({})
  const [burnAmount, setBurnAmount] = useState('')
  const [unxGetForBurn, setUnxGetForBurn] = useState('')
  const [exchangeAsset, setExchangeAsset] = useState({})
  const [exchangeToAsset, setExchangeToAsset] = useState({})
  const [exchangeAmount, setExchangeAmount] = useState('')
  const [exchangeToAssets, setExchangeToAssets] = useState([])
  const [exchangeToAmount, setExchangeToAmount] = useState('')
  const [showMintModal, setShowMintModal] = useState(false)
  const [showBurnModal, setShowBurnModal] = useState(false)
  const [showExchangeModal, setShowExchangeModal] = useState(false)
  const { account, tokens, pairs, poolStat, stat, marketStat, availableReward, synthType, synthPoolWeightRatio, unxToken, unxPrice, SYNTH_ADDRESS } = useMappedState((state) => ({
    account: state.wallet.account,
    tokens: state.common.tokens,
    pairs: state.swap.pairs,
    poolStat: state.gov.poolStat,
    ...state.synth,
    synthPoolWeightRatio: state.gov.poolStat.pools.synth.ratio,
    SYNTH_ADDRESS: state.gov.poolStat.pools.synth.address
  }))
  const dispatch = useDispatch()
  const setModal = useCallback((modalType, modalDetail) => dispatch({ type: 'SET_MODAL', modalType, modalDetail }), [])
  const setStat = useCallback((stat) => dispatch({ type: 'SET_SYNTH_STAT', stat }), [])
  const setMarketStat = useCallback((marketStat) => dispatch({ type: 'SET_SYNTH_MARKET_STAT', marketStat }), [])
  const setAvailableReward = useCallback((availableReward) => dispatch({ type: 'SET_SYNTH_AVAILABLE_REWARD', availableReward }), [])
  const setSynthType = useCallback((synthType) => dispatch({ type: 'SET_SYNTH_TYPE', synthType }), [])
  const setUnxToken = useCallback((unxToken) => dispatch({ type: 'SET_SYNTH_UNX_TOKEN', unxToken }), [])
  const setUnxPrice = useCallback((unxPrice) => dispatch({ type: 'SET_SYNTH_UNX_PRICE', unxPrice }), [])

  const Alert = useAlert()
  const [t] = useTranslation()

  useFetchPairs()

  useEffect(() => {
    if (tokens.length) {
      setUnxToken(tokens.find((t) => t.name === 'UNX'))
    }
  }, [tokens])

  useEffect(() => {
    if (tokens.length && pairs.length && (!unxPrice || unxPrice === '0') && marketStat.marketAssetValue) {
      const unxTk = tokens.find((t) => t.name === 'UNX')
      if (!marketStat.marketAssetBalances.length) {
        const daiTk = tokens.find((t) => t.name === 'pDAI')
        const pair = pairs.find((p) => (p.token1 === unxTk.id && p.token2 === daiTk.id) || (p.token2 === unxTk.id && p.token1 === daiTk.id))

        if (pair) {
          if (pair.token1 === unxTk.id) {
            setUnxPrice(new BigNumber(pair.reserve2).div(10 ** daiTk.decimals).div(pair.reserve1).times(10 ** unxTk.decimals).times(DAI_PRICE).times(SYNTH_PRICE_DECIMALS).toString())
          } else {
            setUnxPrice(new BigNumber(pair.reserve1).div(10 ** daiTk.decimals).div(pair.reserve2).times(10 ** unxTk.decimals).times(DAI_PRICE).times(SYNTH_PRICE_DECIMALS).toString())
          }
        }
      } else {
        setUnxPrice(new BigNumber(marketStat.marketAssetValue).div(marketStat.marketTokenBalance).times(10 ** unxTk.decimals).toString())
      }

      setUnxToken(unxTk)
    }
  }, [pairs, tokens, marketStat])

  useEffect(() => {
    async function getAvailableReward() {
      if (account && unxToken.id && SYNTH_ADDRESS) {
        try {
          const claimStr = await cyanoRequest('smartContract.invokeWasmRead', {
            scriptHash: SYNTH_ADDRESS,
            operation: 'claim_unx',
            args: [
              {
                type: 'Long',
                value: unxToken.id
              },
              {
                type: 'Address',
                value: account
              }
            ]
          })

          const strReader = new StringReader(claimStr)
          const availableReward = strReader.readUint128()

          setAvailableReward(new BigNumber(availableReward).toString())
        } catch (e) {
          console.log(e)
        }
      }
    }

    getAvailableReward()
    const interval = setInterval(getAvailableReward, 10000)
    return () => {
      interval && clearInterval(interval)
    }
  }, [account, unxToken, SYNTH_ADDRESS])

  useEffect(() => {
    async function getStat() {
      if (tokens.length && SYNTH_ADDRESS) {
        try {
          const statStr = await cyanoRequest('smartContract.invokeWasmRead', {
            scriptHash: SYNTH_ADDRESS,
            operation: 'stat',
            args: []
          })
          const strReader = new StringReader(statStr)
  
          reverseHex(strReader.read(20)) // govAddress
          strReader.readUint128() // daiTokenId
          strReader.readUint128() // unxTokenId
          strReader.readUint128() // pairId

          const liveAssetCount = strReader.readNextLen()
          const liveAssets = []
          for (let i = 0; i < liveAssetCount; i++) {
            const asset = {}
            asset.assetId = strReader.readUint128()
            asset.tokenId = strReader.readUint128()

            const token = tokens.find((t) => t.id === asset.tokenId)
            asset.tokenName = token.name
            asset.decimals = token.decimals
            asset.leverageType = strReader.readNextByte()
            asset.times = strReader.readUint128()
            asset.entryPrice = readBigNumberUint128(strReader)
            asset.lowLimit = readBigNumberUint128(strReader)
            asset.highLimit = readBigNumberUint128(strReader)
            asset.status = strReader.readNextByte()
            asset.frozenBy = reverseHex(strReader.read(20))
            asset.frozenTime = strReader.readUint64()

            if (asset.tokenName.startsWith('p')) {
              asset.tokenName = asset.tokenName.replace('p', '')
            }
            asset.tokenName = `${asset.leverageType === LEVERAGE_TYPE.Negative ? 'i' : 's'}${asset.tokenName}`
            asset.id = asset.assetId
            asset.value = asset.assetId
            asset.label = `${asset.tokenName}${asset.times !== 1 ? ` (${asset.times}x)` : ''}`
            liveAssets.push(asset)
          }

          const frozenAssetCount = strReader.readNextLen()
          const frozenAssets = []
          for (let i = 0; i < frozenAssetCount; i++) {
            const asset = {}
            asset.assetId = strReader.readUint128()
            asset.tokenId = strReader.readUint128()

            const token = tokens.find((t) => t.id === asset.tokenId)
            asset.tokenName = token.name
            asset.decimals = token.decimals
            asset.leverageType = strReader.readNextByte()
            asset.times = strReader.readUint128()
            asset.entryPrice = readBigNumberUint128(strReader)
            asset.lowLimit = readBigNumberUint128(strReader)
            asset.highLimit = readBigNumberUint128(strReader)
            asset.status = strReader.readNextByte()
            asset.frozenBy = reverseHex(strReader.read(20))
            asset.frozenTime = strReader.readUint64()

            if (asset.tokenName.startsWith('p')) {
              asset.tokenName = asset.tokenName.replace('p', '')
            }
            asset.tokenName = `${asset.leverageType === LEVERAGE_TYPE.Negative ? 'i' : 's'}${asset.tokenName}`
            asset.label = `${asset.tokenName}${asset.times !== 1 ? ` (${asset.times}x)` : ''}`
  
            frozenAssets.push(asset)
          }

          const tokenPriceCount = strReader.readNextLen()
          const tokenPrices = []
          for (let i = 0; i < tokenPriceCount; i++) {
            const tokenPrice = {}
            tokenPrice.tokenId = strReader.readUint128()
            tokenPrice.price = readBigNumberUint128(strReader)
  
            tokenPrices.push(tokenPrice)
          }

          for (let liveAsset of liveAssets) {
            const currentPrice = tokenPrices.find((tp) => tp.tokenId === liveAsset.tokenId).price
            let tokenPrice = currentPrice

            if (liveAsset.lowLimit && new BigNumber(currentPrice).lte(new BigNumber(liveAsset.lowLimit))) {
              tokenPrice = liveAsset.lowLimit
            } else if (liveAsset.highLimit && new BigNumber(currentPrice).gte(new BigNumber(liveAsset.highLimit))) {
              tokenPrice = liveAsset.highLimit
            }

            liveAsset.tokenPrice = tokenPrice

            if (liveAsset.leverageType === LEVERAGE_TYPE.Positive) {
              liveAsset.price = new BigNumber(liveAsset.entryPrice).plus(new BigNumber(tokenPrice).times(liveAsset.times)).minus(new BigNumber(liveAsset.entryPrice).times(liveAsset.times)).toString()
            } else {
              liveAsset.price = new BigNumber(liveAsset.entryPrice).plus(new BigNumber(liveAsset.entryPrice).times(liveAsset.times)).minus(new BigNumber(tokenPrice).times(liveAsset.times)).toString()
            }

            if ((liveAsset.lowLimit && new BigNumber(liveAsset.tokenPrice).lte(new BigNumber(liveAsset.lowLimit))) || (liveAsset.highLimit && new BigNumber(liveAsset.tokenPrice).gte(new BigNumber(liveAsset.highLimit)))) {
              liveAsset.unprocessedFrozen = true
            }
          }

          for (let frozenAsset of frozenAssets) {
            frozenAsset.tokenPrice = tokenPrices.find((tp) => tp.tokenId === frozenAsset.tokenId).price
            if (frozenAsset.status === ASSET_STATUS.HighLimit) {
              frozenAsset.tokenPrice = frozenAsset.highLimit
            } else if (frozenAsset.status === ASSET_STATUS.LowLimit) {
              frozenAsset.tokenPrice = frozenAsset.lowLimit
            }
          }

          setStat({
            liveAssets,
            frozenAssets,
            tokenPrices
          })
        } catch (e) {
          console.log('get synth stat', e)
        }
      }
    }

    getStat()
    const interval = setInterval(getStat, 5000)

    return () => clearInterval(interval)
  }, [tokens, SYNTH_ADDRESS])

  useEffect(() => {
    async function getMarketStat() {
      if (account && unxToken.id && SYNTH_ADDRESS) {
        try {
          const statStr = await cyanoRequest('smartContract.invokeWasmRead', {
            scriptHash: SYNTH_ADDRESS,
            operation: 'market_stat',
            args: [
              {
                type: 'Long',
                value: unxToken.id
              },
              {
                type: 'Address',
                value: account
              }
            ]
          })
          const strReader = new StringReader(statStr)

          const marketAssetBalanceCount = strReader.readNextLen()
          const marketAssetBalances = []
          let marketAssetValueSum = new BigNumber(0)
          for (let i = 0; i < marketAssetBalanceCount; i++) {
            const assetBalance = {}
            assetBalance.assetId = strReader.readUint128()
            assetBalance.balance = readBigNumberUint128(strReader)
            assetBalance.assetPrice = readBigNumberUint128(strReader)

            const asset = stat.liveAssets ? [...stat.liveAssets, ...stat.frozenAssets].find((la) => la.assetId === assetBalance.assetId) : null

            if (asset) {
              marketAssetValueSum = marketAssetValueSum.plus(new BigNumber(assetBalance.assetPrice).times(assetBalance.balance).div(10 ** asset.decimals))
            }
  
            marketAssetBalances.push(assetBalance)
          }

          const accountAssetBalanceCount = strReader.readNextLen()
          const accountAssetBalances = []
          let accountAssetValueSum = new BigNumber(0)
          for (let i = 0; i < accountAssetBalanceCount; i++) {
            const assetBalance = {}
            assetBalance.assetId = strReader.readUint128()
            assetBalance.balance = readBigNumberUint128(strReader)
            assetBalance.assetPrice = readBigNumberUint128(strReader)

            const asset = stat.liveAssets ? [...stat.liveAssets, ...stat.frozenAssets].find((la) => la.assetId === assetBalance.assetId) : null

            if (asset) {
              accountAssetValueSum = accountAssetValueSum.plus(new BigNumber(assetBalance.assetPrice).times(assetBalance.balance).div(10 ** asset.decimals))
            }
  
            accountAssetBalances.push(assetBalance)
          }

          const marketStakeValue = readBigNumberUint128(strReader)
          const accountStakeValue = readBigNumberUint128(strReader)
          const marketTokenBalance = readBigNumberUint128(strReader)
          const accountClaimedValue = readBigNumberUint128(strReader)
          const accountWithdrawedStakeValue = readBigNumberUint128(strReader)
          const transferable = (marketAssetValueSum.toString() !== '0') ? accountAssetValueSum.div(marketAssetValueSum).times(marketTokenBalance).toString() : '0'

          const parsedMarketStat = {
            marketAssetBalances,
            accountAssetBalances,
            marketAssetValue: marketAssetValueSum.toString(),
            accountAssetValue: accountAssetValueSum.toString(),
            transferable,
            marketStakeValue,
            accountStakeValue,
            marketTokenBalance,
            accountClaimedValue,
            accountWithdrawedStakeValue
          }

          setMarketStat(parsedMarketStat)
        } catch (e) {
          console.log(e)
        }
      }
    }

    getMarketStat()
    const interval = setInterval(getMarketStat, 5000)
    return () => {
      interval && clearInterval(interval)
    }
  }, [account, unxToken, stat.liveAssets, SYNTH_ADDRESS])

  const handleMintAmountChange = (amount) => {
    setMintAmount(amount)
    if (unxPrice && amount) {
      setUnxNeededForMint(new BigNumber(amount).times(mintAsset.price).div(unxPrice).div(1 - TRANSACTION_FEE_RATE).toFixed(unxToken.decimals))
    } else if (Number(amount) === 0) {
      setUnxNeededForMint('')
    }
  }

  const handleUnxNeededForMintChange = (amount) => {
    setUnxNeededForMint(amount)
    if (unxPrice && amount) {
      setMintAmount(new BigNumber(amount).times(unxPrice).div(mintAsset.price).times(1 - TRANSACTION_FEE_RATE).toFixed(mintAsset.decimals))
    } else if (Number(amount) === 0) {
      setMintAmount('')
    }
  }

  const handleBurnAmountChange = (amount) => {
    setBurnAmount(amount)
    if (unxPrice && amount) {
      setUnxGetForBurn(new BigNumber(amount).times(burnAsset.assetPrice).div(unxPrice).times(1 - TRANSACTION_FEE_RATE).toFixed(unxToken.decimals))
    } else if (Number(amount) === 0) {
      setUnxGetForBurn('')
    }
  }

  const handleUnxGetForBurnChange = (amount) => {
    setUnxGetForBurn(amount)
    if (unxPrice && amount) {
      setBurnAmount(new BigNumber(amount).times(unxPrice).div(burnAsset.assetPrice).div(1 - TRANSACTION_FEE_RATE).toFixed(burnAsset.decimals))
    } else if (Number(amount) === 0) {
      setBurnAmount('')
    }
  }

  const handleExchangeAmountChange = (amount) => {
    setExchangeAmount(amount)
    if (amount) {
      setExchangeToAmount(new BigNumber(exchangeAsset.price).div(exchangeToAsset.price).times(amount).times(10 ** exchangeAsset.decimals).div(10 ** exchangeToAsset.decimals).times(1 - TRANSACTION_FEE_RATE).toFixed(exchangeToAsset.decimals))
    } else if (Number(amount) === 0) {
      setExchangeToAmount('')
    }
  }

  const handleChengeExchangeToAmount = (amount) => {
    setExchangeToAmount(amount)
    if (amount) {
      setExchangeAmount(new BigNumber(amount).times(10 ** exchangeToAsset.decimals).div(10 ** exchangeAsset.decimals).times(exchangeToAsset.price).div(exchangeAsset.price).div(1 - TRANSACTION_FEE_RATE).toFixed(exchangeAsset.decimals))
    } else if (Number(amount) === 0) {
      setExchangeAmount('')
    }
  }

  const maxBurnAmount = () => {
    if (burnAsset) {
      handleBurnAmountChange(new BigNumber(burnAsset.balance).div(10 ** burnAsset.decimals).toString())
    }
  }

  const maxExchangeAmount = () => {
    if (exchangeAsset) {
      handleExchangeAmountChange(new BigNumber(exchangeAsset.balance).div(10 ** exchangeAsset.decimals).toString())
    }
  }

  const handleChangeExchangeToAsset = (asset) => {
    setExchangeToAsset(asset)
    if (exchangeAmount) {
      setExchangeToAmount(new BigNumber(exchangeAsset.price).div(asset.price).times(exchangeAmount).times(10 ** exchangeAsset.decimals).div(10 ** asset.decimals).times(1 - TRANSACTION_FEE_RATE).toFixed(asset.decimals))
    } else if (Number(exchangeAmount) === 0) {
      setExchangeToAmount('')
    }
  }

  async function onMint() {
    if (!account) {
      Alert.show(t('connect_wallet_first'))
      return
    }

    if (unxToken.id && mintAsset.assetId && SYNTH_ADDRESS) {
      if (mintAmount <= 0) {
        Alert.error(t('amount_gt_0'))
        return
      }
      try {
        const args = [
          {
            type: 'Long',
            value: unxToken.id
          },
          {
            type: 'Address',
            value: account
          },
          {
            type: 'Long',
            value: new BigNumber(unxNeededForMint).times(new BigNumber(10 ** unxToken.decimals)).integerValue(BigNumber.ROUND_DOWN).toString()
          },
          {
            type: 'Long',
            value: mintAsset.assetId
          }
        ]
        const mintResult = await cyanoRequest('smartContract.invokeWasm', {
          scriptHash: SYNTH_ADDRESS,
          operation: 'mint',
          args,
          gasPrice: 2500,
          gasLimit: 60000000,
          requireIdentity: false
        })

        if (mintResult.transaction) {
          setShowMintModal(false)
          setMintAmount('')
          setUnxNeededForMint('')

          let detail = ''

          EventRequest({
            method: 'get',
            url: `${mintResult.transaction}`
          }).then((resp) => {
            if (resp.Desc === 'SUCCESS') {
              try {
                const eventStates = resp.Result.Notify.find((notify) => notify.States[0] === 'mint').States

                if (eventStates[5] === '0') {
                  detail = t('freeze_asset', {asset: mintAsset.label})
                }
              } catch (e) {}

              setInfoModal('success', mintResult.transaction, detail)
            }
          }).catch((e) => {
            setInfoModal('success', mintResult.transaction)
          })
        }
      } catch (e) {
        setShowMintModal(false)
        setMintAmount('')
        setUnxNeededForMint('')
        setInfoModal('error')
      }
    }
  }

  async function onBurn() {
    if (!account) {
      Alert.show(t('connect_wallet_first'))
      return
    }

    if (unxToken.id && burnAsset.assetId && SYNTH_ADDRESS) {
      if (burnAmount <= 0) {
        Alert.error(t('amount_gt_0'))
        return
      }
      try {
        const args = [
          {
            type: 'Long',
            value: unxToken.id
          },
          {
            type: 'Address',
            value: account
          },
          {
            type: 'Long',
            value: burnAsset.assetId
          },
          {
            type: 'Long',
            value: new BigNumber(burnAmount).times(new BigNumber(10 ** burnAsset.decimals)).integerValue(BigNumber.ROUND_DOWN).toString()
          }
        ]
        const burnResult = await cyanoRequest('smartContract.invokeWasm', {
          scriptHash: SYNTH_ADDRESS,
          operation: 'burn',
          args,
          gasPrice: 2500,
          gasLimit: 60000000,
          requireIdentity: false
        })

        if (burnResult.transaction) {
          setShowBurnModal(false)
          setBurnAmount('')
          setUnxGetForBurn('')
          setInfoModal('success', burnResult.transaction)
        }
      } catch (e) {
        setShowBurnModal(false)
        setBurnAmount('')
        setUnxGetForBurn('')
        setInfoModal('error')
      }
    }
  }

  async function onBurnAll() {
    if (!account) {
      Alert.show(t('connect_wallet_first'))
      return
    }

    if (unxToken.id && SYNTH_ADDRESS) {
      try {
        const args = [
          {
            type: 'Long',
            value: unxToken.id
          },
          {
            type: 'Address',
            value: account
          }
        ]
        // const burnAllResult = await client.api.smartContract.invokeWasm({
        //   scriptHash: SYNTH_ADDRESS,
        //   operation: 'burn_all_asset',
        //   args,
        //   gasPrice: 2500,
        //   gasLimit: 60000000,
        //   requireIdentity: false
        // })

        const burnAllResult = await cyanoRequest('smartContract.invokeWasm', {
          scriptHash: SYNTH_ADDRESS,
          operation: 'burn_all_asset',
          args,
          gasPrice: 2500,
          gasLimit: 60000000,
          requireIdentity: false
        })

        if (burnAllResult.transaction) {
          setInfoModal('success', burnAllResult.transaction)
        }
      } catch (e) {
        setInfoModal('error')
      }
    }
  }

  async function onExchange() {
    if (!account) {
      Alert.show(t('connect_wallet_first'))
      return
    }

    if (unxToken.id && exchangeAsset.assetId && SYNTH_ADDRESS) {
      if (exchangeAmount <= 0) {
        Alert.error(t('amount_gt_0'))
        return
      }
      try {
        const args = [
          {
            type: 'Long',
            value: unxToken.id
          },
          {
            type: 'Address',
            value: account
          },
          {
            type: 'Long',
            value: exchangeAsset.assetId
          },
          {
            type: 'Long',
            value: new BigNumber(exchangeAmount).times(new BigNumber(10 ** exchangeAsset.decimals)).integerValue(BigNumber.ROUND_DOWN).toString()
          },{
            type: 'Long',
            value: exchangeToAsset.assetId
          }
        ]
        const exchangeResult = await cyanoRequest('smartContract.invokeWasm', {
          scriptHash: SYNTH_ADDRESS,
          operation: 'asset_swap',
          args,
          gasPrice: 2500,
          gasLimit: 60000000,
          requireIdentity: false
        })

        if (exchangeResult.transaction) {
          setShowExchangeModal(false)
          setExchangeAmount('')
          setExchangeToAmount('')

          let detail = ''

          EventRequest({
            method: 'get',
            url: `${exchangeResult.transaction}`
          }).then((resp) => {
            if (resp.Desc === 'SUCCESS') {
              try {
                const eventStates = resp.Result.Notify.find((notify) => notify.States[0] === 'asset_swap').States

                if (eventStates[4] === '0') {
                  detail = t('freeze_asset', {asset: exchangeAsset.label})
                }
              } catch (e) {}

              setInfoModal('success', exchangeResult.transaction, detail)
            }
          }).catch((e) => {
            setInfoModal('success', exchangeResult.transaction)
          })
        }
      } catch (e) {
        setShowExchangeModal(false)
        setExchangeAmount('')
        setExchangeToAmount('')
        setInfoModal('error')
      }
    }
  }

  async function onClaim() {
    if (!account) {
      Alert.show(t('connect_wallet_first'))
      return
    }

    if (unxToken.id && SYNTH_ADDRESS) {
      try {
        const args = [
          {
            type: 'Long',
            value: unxToken.id
          },
          {
            type: 'Address',
            value: account
          }
        ]
        const claimResult = await cyanoRequest('smartContract.invokeWasm', {
          scriptHash: SYNTH_ADDRESS,
          operation: 'claim_unx',
          args,
          gasPrice: 2500,
          gasLimit: 60000000,
          requireIdentity: false
        })

        if (claimResult.transaction) {
          setInfoModal('success', claimResult.transaction)
        }
      } catch (e) {
        setInfoModal('error')
      }
    }
  }

  const handleFreezeAsset = async (asset) => {
    if (!account) {
      Alert.show(t('connect_wallet_first'))
      return
    }

    if (SYNTH_ADDRESS) {
      try {
        const args = [
          {
            type: 'Address',
            value: account
          },
          {
            type: 'Long',
            value: asset.assetId
          }
        ]
        const freezeResult = await cyanoRequest('smartContract.invokeWasm', {
          scriptHash: SYNTH_ADDRESS,
          operation: 'freeze_asset',
          args,
          gasPrice: 2500,
          gasLimit: 60000000,
          requireIdentity: false
        })

        if (freezeResult.transaction) {
          setInfoModal('success', freezeResult.transaction)
        }
      } catch (e) {
        setInfoModal('error')
      }
    }
  }

  const calcEffectiveLeverage = (asset) => {
    if (asset.leverageType === LEVERAGE_TYPE.Positive) {
      return new BigNumber(asset.tokenPrice).times(asset.times)
        .div(new BigNumber(asset.tokenPrice).times(asset.times).plus(asset.entryPrice).minus(new BigNumber(asset.entryPrice).times(asset.times)))
        .toFixed(2)
    } else if (asset.leverageType === LEVERAGE_TYPE.Negative) {
      return new BigNumber(asset.tokenPrice).times(asset.times)
        .div(new BigNumber(asset.entryPrice).times(asset.times).plus(asset.entryPrice).minus(new BigNumber(asset.tokenPrice).times(asset.times)))
        .toFixed(2)
    }
  }

  const getPriceDetail = (asset) => {
    let txt = `Entry Price: ${new BigNumber(asset.entryPrice).div(SYNTH_PRICE_DECIMALS).toString()}`
    if (Number(asset.lowLimit)) {
      txt += ` Low Limit: ${new BigNumber(asset.lowLimit).div(SYNTH_PRICE_DECIMALS).toString()}`
    }
    if (Number(asset.highLimit)) {
      txt += ` High Limit: ${new BigNumber(asset.highLimit).div(SYNTH_PRICE_DECIMALS).toString()}`
    }
    
    return txt
  }

  const renderAssetList = () => {
    if (synthType === 'mint') {
      if (stat.liveAssets) {
        const assetList = stat.liveAssets.map((la) => {
          const accountAsset = marketStat.accountAssetBalances ? marketStat.accountAssetBalances.find((ab) => ab.assetId === la.assetId) : null
          const showPriceDetail = !(la.times === 1 && la.leverageType === LEVERAGE_TYPE.Positive)

          if (accountAsset) {
            la.holdings = new BigNumber(accountAsset.assetPrice).div(SYNTH_PRICE_DECIMALS).times(accountAsset.balance).div(10 ** la.decimals).toString()
          }

          la.effectiveLeverage = calcEffectiveLeverage(la)

          return (
            <div className={`synth-assets-list-item ${la.unprocessedFrozen ? 'unprocessed-frozen' : ''}`} key={la.assetId}>
              <div className="synth-assets-list-item-name">
                <div className={`synth-assets-list-item-icon icon-${la.tokenName}`}>
                  {
                    showPriceDetail ? (
                      <Tooltip placement="top" overlay={getPriceDetail(la)}><span>{la.label}</span></Tooltip>
                    ) : <span>{la.label}</span>
                  }
                  {
                    la.unprocessedFrozen ? (
                      <Tooltip placement="top" overlay={t('first_freeze_hint')}>
                        <span className="freeze-asset-btn" onClick={() => handleFreezeAsset(la)}></span>
                      </Tooltip>
                    ) : null
                  }
                </div>
              </div>
              <div className="synth-assets-list-item-price">{new BigNumber(la.price).div(SYNTH_PRICE_DECIMALS).toString()}</div>
              <div className="synth-assets-list-item-holding">{la.holdings || 0}</div>
              <div className="synth-assets-list-item-leverage">{la.effectiveLeverage}</div>
              <div className="synth-assets-list-item-action">
                <div className="synth-assets-list-item-action-mint" onClick={() => { setShowMintModal(true); setMintAsset(la); }}>{t('mint')}</div>
              </div>
            </div>
          )
        })
        return assetList.length ? assetList : (<div className="empty-asset-hint">{t('no_assets')}</div>)
      } else {
        return (<div className="asset-loading-hint">{t('loading')}</div>)
      }
    } else {
      if (marketStat.accountAssetBalances) {
        const assetList = marketStat.accountAssetBalances.map((ab) => {
          let asset = stat.liveAssets ? stat.liveAssets.find((la) => la.assetId === ab.assetId) : null

          if (!asset) {
            asset = stat.frozenAssets ? stat.frozenAssets.find((fa) => fa.assetId === ab.assetId) : null

            if (asset) {
              asset.isFrozen = true
            }
          }

          if (asset) {
            if (!asset.isFrozen) {
              if ((asset.lowLimit && new BigNumber(asset.tokenPrice).lte(new BigNumber(asset.lowLimit))) || (asset.highLimit && new BigNumber(asset.tokenPrice).gte(new BigNumber(asset.highLimit)))) {
                asset.unprocessedFrozen = true
              }
            }
            asset.balance = ab.balance
            asset.assetPrice = ab.assetPrice
            asset.effectiveLeverage = calcEffectiveLeverage(asset)
          }
          return asset ? (
            <div className={`synth-assets-list-item ${asset.isFrozen ? 'frozen' : ''} ${asset.unprocessedFrozen ? 'unprocessed-frozen' : ''}`} key={ab.assetId}>
              <div className="synth-assets-list-item-name">
                <div className={`synth-assets-list-item-icon icon-${asset.tokenName}`}>
                  {asset.label}
                  {
                    asset.unprocessedFrozen ? (
                      <Tooltip placement="top" overlay={t('first_freeze_hint')}>
                        <span onClick={() => handleFreezeAsset(asset)}></span>
                      </Tooltip>
                    ) : null
                  }
                </div>
              </div>
              <div className="synth-assets-list-item-price">{new BigNumber(ab.assetPrice).div(SYNTH_PRICE_DECIMALS).toString()}</div>
              <div className="synth-assets-list-item-holding">{new BigNumber(ab.assetPrice).div(SYNTH_PRICE_DECIMALS).times(ab.balance).div(10 ** asset.decimals).toString()}</div>
              <div className="synth-assets-list-item-leverage">{asset.effectiveLeverage}</div>
              <div className="synth-assets-list-item-action">
                <div className="synth-assets-list-item-action-burn" onClick={() => { setShowBurnModal(true); setBurnAsset(asset); }}>{t('burn')}</div>
                <div className="synth-assets-list-item-action-exchange"
                  onClick={() => {
                    setShowExchangeModal(true)
                    setExchangeAsset(asset)
                    const toAssets = stat.liveAssets.filter((la) => la.assetId !== asset.assetId)
                    setExchangeToAssets(toAssets)
                    setExchangeToAsset(toAssets[0])
                  }}
                >{t('exchange')}</div>
              </div>
            </div>
          ) : null
        })

        return assetList.length ? assetList : (<div className="empty-asset-hint">{t('no_assets')}</div>)
      } else {
        return (<div className="asset-loading-hint">{t('loading')}</div>)
      }
    }
  }

  const setInfoModal = (type, transaction, detail) => {
    setModal('infoModal', {
      show: true,
      type,
      text: type === 'success' ? t('transaction_successful') : t('transaction_failed'),
      detail,
      extraText: type === 'success' ? t('view_transaction') : '',
      extraLink: type === 'success' ? `${TRANSACTION_BASE_URL}${transaction}${TRANSACTION_AFTERFIX}` : ''
    })
  }

  return (
    <div className="synth-container">
      <div className="synth-overview-sections">
        <div className="synth-overview-section">
          <div className="synth-overview-sub-section">
            <p className="synth-overview-section-title">{t('mint_apy')}</p>
            <p className="synth-overview-detail">{(marketStat.marketStakeValue && unxToken.id) ? new BigNumber(poolStat.distributionInfo.amount || 0).div(poolStat.distributionInfo.period || 1).times(86400 * 365).times(10 ** unxToken.decimals).times(synthPoolWeightRatio || 0).div(marketStat.marketStakeValue).toFixed(2) : 0}%</p>
          </div>
          <div className="synth-overview-section-group">
            <div className="synth-overview-sub-section">
              <p className="synth-overview-section-title">{t('market_balance')}</p>
              <p className="synth-overview-detail">{marketStat.marketTokenBalance ? new BigNumber(marketStat.marketTokenBalance).div(10 ** unxToken.decimals).toFixed(unxToken.decimals) : '0'} <span>UNX</span></p>
            </div>
          </div>
        </div>
        <div className="synth-overview-section-right">
          <div className="synth-overview-sub-section">
            <p className="synth-overview-section-title">{t('transferable')}</p>
            <p className="synth-overview-detail">{(marketStat.transferable && marketStat.transferable !== '0') ? new BigNumber(marketStat.transferable).plus(availableReward).div(10 ** unxToken.decimals).toFixed(unxToken.decimals) : '0'} <span>UNX</span></p>
          </div>
          <div className="synth-overview-section-group">
            <div className="synth-overview-sub-section">
              <p className="synth-overview-section-title">{t('staked')}</p>
              <p className="synth-overview-detail">{(marketStat.transferable && marketStat.transferable !== '0') ? (new BigNumber(marketStat.transferable)).div(10 ** unxToken.decimals).toFixed(unxToken.decimals) : '0'} <span>UNX</span>
                { (marketStat.transferable && marketStat.transferable !== '0') ? <span className="synth-overview-action-btn synth-overview-action-btn-burn" onClick={() => onBurnAll()}>{t('burn_all')}</span> : null }
              </p>
            </div>
            <div className="synth-overview-sub-section">
              <p className="synth-overview-section-title">{t('rewards_available')}</p>
              <p className="synth-overview-detail">{unxToken.id ? new BigNumber(availableReward).div(10 ** unxToken.decimals).toString() : 0}
                <span>UNX</span>
                { (availableReward && availableReward !== '0') ? <span className="synth-overview-action-btn" onClick={() => onClaim()}>{t('claim')}</span> : null }
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="mint-burn-wrapper">
        <div className="mint-burn-main">
          <div className="synth-type-switch">
            <div className={`synth-type-item ${synthType === 'mint' ? 'selected' : ''}`} onClick={() => setSynthType('mint')}>{t('mint')}</div>
            <div className={`synth-type-item ${synthType === 'burn' ? 'selected' : ''}`} onClick={() => setSynthType('burn')}>{t('burn')}</div>
          </div>
          <div className="market-asset-value">{t('market_asset_value')}: &nbsp;&nbsp;<span>${new BigNumber(marketStat.marketAssetValue || 0).div(SYNTH_PRICE_DECIMALS).toString()}</span></div>
          <div className="synth-assets-panel">
            <div className="synth-assets-panel-header">
              <div className="panel-header-item panel-header-item-asset">{t('asset')}</div>
              <div className="panel-header-item">{t('price')}($)</div>
              <div className="panel-header-item">{t('holdings')}($)</div>
              <div className="panel-header-item">{t('effective_leverage')}</div>
              <div className="panel-header-item panel-header-item-action"></div>
            </div>
            <div className="synth-assets-list">
              {renderAssetList()}
            </div>
          </div>
        </div>
        {
          synthType === 'mint' ? (
            <div className="mint-burn-info">
              <div className="mint-burn-info-title">{t('mint_synthetics_by_staking_unx')}</div>
              <div className="mint-burn-info-desc">{t('earn_staking_rewards_once_minted')}</div>
              <div className="mint-burn-account-info">
                <div className="mint-burn-account-info-line">{t('minted_with')} <span>{new BigNumber(marketStat.accountStakeValue || 0).div(10 ** unxToken.decimals).toString() || '0'} UNX</span></div>
              </div>
            </div>
          ) : (
            <div className="mint-burn-info">
              <div className="mint-burn-info-title">{t('burn_synthetics_to_unstake_unx')}</div>
              <div className="mint-burn-info-desc">{t('burn_synthetics_to_withdraw_unx')}</div>
              <div className="mint-burn-account-info">
                <div className="mint-burn-account-info-line">{t('assets')}($) <span>{new BigNumber(marketStat.accountAssetValue).div(SYNTH_PRICE_DECIMALS).toString()}</span></div>
              </div>
              <div className="mint-burn-info-note"><strong>{t('note')}</strong>: {t('effective_leverage_exceed')} <span>{t('have_to_burn')}</span> {t('unx_be_donated')}</div>
            </div>
          )
        }
        
      </div>
      {
        showMintModal ? (
          <div className="modal-overlay">
            <div className="modal-wrapper">
              <div className="close-btn" onClick={() => {setShowMintModal(false);setMintAmount('');setUnxNeededForMint('');}}></div>
              <div className="mint-wrapper">
                <div className="mint-wrapper-title">{t('mint')} {mintAsset.label}</div>
                <div className="mint-wrapper-info">{t('price')}($)<span>{new BigNumber(mintAsset.price).div(SYNTH_PRICE_DECIMALS).toString()}</span></div>
                <div className="form-item">
                  <div className="input-label">{t('amount')}</div>
                  <div className="input-wrapper">
                    <Input placeholder="0.0" value={mintAmount} decimals={mintAsset.decimals || 0} onChange={(amount) => handleMintAmountChange(amount)} />
                  </div>
                </div>
                <TokenInput
                  label={`${t('you_need_to_pay')} (UNX)`}
                  value={unxNeededForMint}
                  defaultToken={unxToken}
                  decimals={unxToken.decimals || 0}
                  onAmountChange={(amount) => handleUnxNeededForMintChange(amount)} />
                <div className="fee-rate">* {t('fee_rate')} 0.1%</div>
                <div className="mint-btn" onClick={() => onMint()}>{t('mint')}</div>
              </div>
            </div>
          </div>
        ) : null
      }
      {
        showBurnModal ? (
          <div className="modal-overlay">
            <div className="modal-wrapper">
              <div className="close-btn" onClick={() => {setShowBurnModal(false);setBurnAmount('');setUnxGetForBurn('');}}></div>
              <div className="burn-wrapper">
                <div className="burn-wrapper-title">{t('burn')} {burnAsset.label}</div>
                <div className="burn-wrapper-info">{t('price')}($)<span>{new BigNumber(burnAsset.assetPrice).div(SYNTH_PRICE_DECIMALS).toString()}</span></div>
                <div className="form-item">
                  <div className="input-label">{t('amount')}
                    <span className="hint">{t('balance')}: {new BigNumber(burnAsset.balance).div(10 ** burnAsset.decimals).toString()}</span>
                  </div>
                  <div className="input-wrapper">
                    <Input placeholder="0.0" value={burnAmount} decimals={burnAsset.decimals || 0} onChange={(amount) => handleBurnAmountChange(amount)} />
                    <div className="input-max-btn" onClick={() => maxBurnAmount()}>{t('max')}</div>
                  </div>
                </div>
                <div className="form-item">
                  <div className="input-label">{t('you_will_get')} (UNX)</div>
                  <div className="input-wrapper">
                    <Input placeholder="0.0" value={unxGetForBurn} decimals={unxToken.decimals || 0} onChange={(amount) => handleUnxGetForBurnChange(amount)} />
                  </div>
                </div>
                <div className="fee-rate">* {t('fee_rate')} 0.1%</div>
                <div className="burn-btn" onClick={() => onBurn()}>{t('burn')}</div>
              </div>
            </div>
          </div>
        ) : null
      }
      {
        showExchangeModal ? (
          <div className="modal-overlay">
            <div className="modal-wrapper">
              <div className="close-btn" onClick={() => {setShowExchangeModal(false);setExchangeAmount('');setExchangeToAmount('');}}></div>
              <div className="exchange-wrapper">
                <div className="exchange-wrapper-title">{t('exchange')} {exchangeAsset.label}</div>
                <div className="form-item">
                  <div className="input-label">{t('amount')}
                    <span className="hint">{t('balance')}: {new BigNumber(exchangeAsset.balance).div(10 ** exchangeAsset.decimals).toString()}</span>
                  </div>
                  <div className="input-wrapper">
                    <Input placeholder="0.0" value={exchangeAmount} decimals={exchangeAsset.decimals || 0} onChange={(amount) => handleExchangeAmountChange(amount)} />
                    <div className="input-max-btn" onClick={() => maxExchangeAmount()}>{t('max')}</div>
                  </div>
                </div>
                <TokenInput
                  cls="asset-select"
                  label={t('exchange_to')}
                  value={exchangeToAmount}
                  tokens={exchangeToAssets}
                  showBalance={false}
                  withMax={false}
                  onTokenChange={(asset) => handleChangeExchangeToAsset(asset)}
                  onAmountChange={(amount) => handleChengeExchangeToAmount(amount)}
                  />
                <div className="fee-rate">* {t('fee_rate')} 0.1%</div>
                <div className="exchange-btn" onClick={() => onExchange()}>{t('exchange')}</div>
              </div>
            </div>
          </div>
        ) : null
      }
    </div>
  )
}

export default Synth