import { client } from '@ont-dev/ontology-dapi'
import { utils } from 'ontology-ts-sdk'
import request from './request'

const { reverseHex } = utils

export const getTokenBalance = (account, token, cb) => {
  if (token.name !== 'ONT' && token.name !== 'ONG') {
    const param = {
      scriptHash: token.address,
      operation: 'balanceOf',
      args: [
        {
          type: 'Address',
          value: account,
        },
      ],
    }
    client.api.smartContract.invokeRead(param).then((bl) => {
      if (bl) {
        cb(parseInt(reverseHex(bl), 16) / (10 ** token.decimals))
      }
    })
  } else {
    request({
      method: 'get',
      url: `/v2/addresses/${account}/native/balances`
    }).then((resp) => {
      if (resp.code === 0) {
        const targetToken = resp.result.find((t) => t.asset_name === token.name.toLowerCase())
        cb(targetToken.balance)
      }
    })
    .catch((e) => {
      console.log(e)
    })
  }
}