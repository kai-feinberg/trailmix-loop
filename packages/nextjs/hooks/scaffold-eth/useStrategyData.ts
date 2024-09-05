import { useEffect } from "react";
import { useScaffoldEventHistory } from "./useScaffoldEventHistory";
import { Strategy, TokenData, TokenList } from '~~/types/customTypes';
import { useContractRead } from "wagmi";
import { useTargetNetwork } from "./useTargetNetwork";
import strategyABI from '~~/contracts/strategyABI.json';
import tokenList from '~~/lib/tokenList.json';
import { useNativeCurrencyPrice } from "./useNativeCurrencyPrice";

const useStrategyData = (contractAddress: string, onDataFetched: any) => {
  const { data: erc20TokenAddress, isLoading: isLoadingErc20TokenAddress } = useContractRead({
    address: contractAddress,
    abi: strategyABI.abi,
    functionName: 'getERC20TokenAddress',
  });

  const { data: twapPrice, isLoading: isLoadingTwapPrice } = useContractRead({
    address: contractAddress,
    abi: strategyABI.abi,
    functionName: 'getTwapPrice',
  });
  const { data: erc20Balance, isLoading: isLoadingErc20Balance } = useContractRead({
    address: contractAddress,
    abi: strategyABI.abi,
    functionName: 'getERC20Balance',
  });
  const { data: stablecoinAddress, isLoading: isLoadingStablecoinAddress } = useContractRead({
    address: contractAddress,
    abi: strategyABI.abi,
    functionName: 'getStablecoinAddress',
  });
  const { data: stablecoinBalance, isLoading: isLoadingStablecoinBalance } = useContractRead({
    address: contractAddress,
    abi: strategyABI.abi,
    functionName: 'getStablecoinBalance',
  });
  const { data: trailAmount, isLoading: isLoadingTrailAmount } = useContractRead({
    address: contractAddress,
    abi: strategyABI.abi,
    functionName: 'getTrailAmount',
  });
  const { data: uniswapPool, isLoading: isLoadingUniswapPool } = useContractRead({
    address: contractAddress,
    abi: strategyABI.abi,
    functionName: 'getUniswapPool',
  });
  const { data: granularity, isLoading: isLoadingGranularity } = useContractRead({
    address: contractAddress,
    abi: strategyABI.abi,
    functionName: 'getGranularity',
  });
  const { data: manager, isLoading: isLoadingManager } = useContractRead({
    address: contractAddress,
    abi: strategyABI.abi,
    functionName: 'getManager',
  });
  const { data: tslThreshold, isLoading: isLoadingTslThreshold } = useContractRead({
    address: contractAddress,
    abi: strategyABI.abi,
    functionName: 'getTSLThreshold',
  });

  const {data: contractState, isLoading: isLoadingContractState} = useContractRead({
    address: contractAddress,
    abi: strategyABI.abi,
    functionName: 'getState',
  });

  const {data: depositValue, isLoading: isLoadingDepositValue} = useContractRead({
    address: contractAddress,
    abi: strategyABI.abi,
    functionName: "getDepositValue"
  })


  const { targetNetwork } = useTargetNetwork();
  const ethPrice = useNativeCurrencyPrice();

  
  const { data: deployEvent, isLoading: isLoadingDeployEvent } = useScaffoldEventHistory({
    contractName: 'TrailMixManager',
    eventName: 'ContractDeployed',
    fromBlock: 122731186n,
    watch: false,
    filters: { contractAddress: contractAddress },
    blockData: true,
    transactionData: true,
    receiptData: true,
  });

  const { data: thresholdUpdates, isLoading: isLoadingThresholdUpdates } = useScaffoldEventHistory({
    contractName: 'TrailMixManager',
    eventName: 'ThresholdUpdated',
    fromBlock: 122731186n,
    watch: false,
    filters: { strategy: contractAddress },
    blockData: true,
    transactionData: true,
    receiptData: true,
  });
  const {data: fundsDeposited, isLoading: isLoadingFundsDeposited}= useScaffoldEventHistory({
    contractName: 'TrailMixManager',
    eventName: 'FundsDeposited',
    fromBlock: 122731186n,
    watch: false,
    filters: { strategy: contractAddress },
    blockData: true,
    transactionData: true,
    receiptData: true,
  });
  

  useEffect(() => {
    // console.log("trying for ", erc20TokenAddress)
    
    if (!isLoadingContractState && !isLoadingStablecoinBalance&&
        !isLoadingErc20TokenAddress && !isLoadingTwapPrice && !isLoadingErc20Balance && !isLoadingStablecoinAddress && !isLoadingTrailAmount
        && !isLoadingUniswapPool && !isLoadingGranularity && !isLoadingManager && !isLoadingTslThreshold &&!isLoadingDeployEvent
        &&deployEvent && !isLoadingThresholdUpdates && thresholdUpdates && !isLoadingFundsDeposited 
      ) {
      try {
        console.log(deployEvent)
        

        const tokenData = (tokenList as TokenList)[targetNetwork.id][erc20TokenAddress?.toString().toLowerCase() ?? ''];
        const stableAssetData = (tokenList as TokenList)[targetNetwork.id][stablecoinAddress?.toString().toLowerCase() ?? '']
        
        const assetDecimals = 10**tokenData.decimals;
        const price = (stablecoinAddress as string).toLowerCase() === "0x0b2c639c533813f4aa9d7837caf62653d097ff85" ? (10**12) : ethPrice;

        let thresholdUpdateData: [number, number][] = [];
        if (thresholdUpdates.length >0){
          thresholdUpdateData= thresholdUpdates.map(update => [Number(update.args.timestamp), Number(update.args.newThreshold)*price/(10 ** 18 * 10 ** (18 - tokenData.decimals))]);
        }
        else{
            thresholdUpdateData.push([Number(deployEvent[0].args.timestamp), Number(tslThreshold)*price/(10 ** 18 * 10 ** (18 - tokenData.decimals))])
        }

        thresholdUpdateData.push([Math.floor(Date.now()/1000), Number(tslThreshold)*price/(10 ** 18 * 10 ** (18 - tokenData.decimals))])
        // thresholdUpdateData.push([Number(fundsDeposited[0].args.timestamp), Number(fundsDeposited[0].args.depositPrice)*(100-Number(trailAmount)/100)/10**12])

        thresholdUpdateData.sort((a, b) => a[0] - b[0]);

        const adjustedThreshold= (Number(tslThreshold) / 10**18);


        
        const examplePriceData = [[
          1711930196348,
          71229.87655843626
        ],
        [
          1711933967449,
          71087.25098030263
        ],
        [
          1711937529850,
          70854.60005957093
        ],
        [
          1711940919485,
          70877.82737240873
        ],
        [
          1711944408457,
          70619.47504803985
        ],
        [
          1711947642579,
          70450.85253074118
        ],
        [
          1711951350459,
          69236.61393631532
        ],
        [
          1711955278210,
          69686.6032574771
        ],
        [
          1711958895598,
          69522.45722667436
        ],
        [
          1711962214189,
          69433.17938185587
        ],
        [
          1711965851821,
          69439.14582052667
        ],
        [
          1711969251509,
          69614.25770884354
        ],
        [
          1711973300060,
          69505.77873187968
        ],
        [
          1711976415204,
          69771.22027973064
        ],
        [
          1711980733147,
          69716.7387720348
        ],
        [
          1711984400766,
          68613.05627372122
        ],
        [
          1711987734901,
          68368.60320757983
        ],
        [
          1711991117695,
          68647.15823839215
        ],
        [
          1711994930182,
          68548.97411085614
        ],
        [
          1711998469853,
          68984.68530295773
        ],
        [
          1712002376222,
          69617.79569684096
        ],
        [
          1712005516695,
          69773.77492380183
        ],
        [
          1712009272278,
          69701.60145938995
        ],
        [
          1712012683305,
          69770.20184774762
        ],
        [
          1712016623415,
          69609.57814998928
        ],
        [
          1712020075335,
          69394.5437783541
        ],
        [
          1712023963634,
          69320.06902054936
        ],
        [
          1712027352809,
          67176.10136218855
        ],
        [
          1712030758050,
          66933.85310279732
        ],
        [
          1712034513764,
          66671.39910443817
        ],
        [
          1712038080709,
          66862.4215085759
        ],
        [
          1712041405158,
          66936.30151190482
        ],
        [
          1712045045975,
          66546.36940230262
        ],
        [
          1712048861964,
          65855.38101245622
        ],
        [
          1712052284555,
          66128.45638286824
        ],
        [
          1712055739985,
          65868.6789275122
        ],
        [
          1712059286969,
          65509.00792365257
        ],
        [
          1712063161279,
          65319.4841988721
        ],
        [
          1712066458181,
          65069.14840403641
        ],
        [
          1712070295601,
          65682.12440219843
        ],
        [
          1712074429906,
          65075.587301571795
        ],
        [
          1712077732247,
          65575.63144062112
        ],
        [
          1712081551226,
          65528.738122162395
        ],
        [
          1712084753851,
          65867.48770254257
        ],
        [
          1712088249135,
          66122.2927223462
        ],
        [
          1712091797288,
          65673.8967241405
        ],
        [
          1712095270586,
          65710.53567781566
        ],
        [
          1712099459638,
          65773.80242597149
        ],
        [
          1712102773039,
          65534.30491580929
        ],
        [
          1712106174663,
          65361.58666035539
        ],
        [
          1712109721574,
          65862.7951120461
        ],
        [
          1712113934502,
          65816.56429769016
        ],
        [
          1712117043007,
          66220.29156494063
        ],
        [
          1712121129757,
          66311.19445004368
        ],
        [
          1712124523344,
          66168.26565312546
        ],
        [
          1712128337010,
          66287.9020179715
        ],
        [
          1712131662043,
          66120.84938255069
        ],
        [
          1712135593016,
          66537.5720223001
        ],
        [
          1712138849240,
          66459.67293437496
        ],
        [
          1712142516362,
          66112.43335472258
        ],
        [
          1712146246048,
          66092.90219264042
        ],
        [
          1712149394886,
          65964.2296585029
        ],
        [
          1712153046145,
          65831.28602966432
        ],
        [
          1712157031448,
          66604.75744540128
        ],
        [
          1712160176107,
          65866.7598419646
        ],
        [
          1712164192202,
          66183.96012117567
        ],
        [
          1712167979694,
          65840.13660777804
        ],
        [
          1712170938994,
          66044.01653029339
        ],
        [
          1712174678369,
          65828.98237712019
        ],
        [
          1712178275939,
          65714.2207783053
        ],
        [
          1712182099073,
          65988.3056752151
        ],
        [
          1712185275281,
          66212.36390036279
        ],
        [
          1712189472392,
          66103.92369277785
        ]]

        const currPrice = (Number(twapPrice)/10**18);

        const depVal= Number(depositValue)/10**36;

        const stableBalUsd = (Number(stablecoinBalance) * price)/ (assetDecimals* 10 ** (18 - tokenData.decimals))
        const ercBalUsd = (Number(erc20Balance)*currPrice/ (10**18))
        const usdValue = ercBalUsd + stableBalUsd;

        // console.log("deposit value", depVal);
        // console.log("current value", usdValue);
        // console.log("price", currPrice);


        const strategy: Strategy = {
            asset: tokenData as TokenData,
            dateCreated: deployEvent[0].args.timestamp?.toString() ?? '',
            contractAddress: contractAddress.toString(),
            erc20Balance: erc20Balance?.toString() ?? '',
            balanceInUsd: usdValue?.toString() ?? '',
            erc20Asset: erc20TokenAddress?.toString() ?? '',
            twapPrice: currPrice?.toString() ?? '',
            trailAmount: trailAmount?.toString() ?? '',
            uniswapPool: uniswapPool?.toString() ?? '',
            granularity: granularity?.toString() ?? '',
            manager: manager?.toString() ?? '',
            tslThreshold: adjustedThreshold?.toString() ?? '',
            stablecoinAddress: stablecoinAddress?.toString() ?? '',
            depositValue: depVal?.toString() ?? '',
      
            contractState: contractState?.toString() ?? '',
            stablecoinBalance: stablecoinBalance?.toString() ?? '',
            stablecoinBalanceInUsd: stableBalUsd?.toString() ?? '',
            stableAsset: stableAssetData as TokenData,
            priceData: examplePriceData as [number, number][],
            // updateData: [[0,0]]

            updateData: thresholdUpdateData as [number, number][],
            profit: (usdValue - depVal).toString()
          
          }
        
        // console.log("strategy: ", strategy);
        // console.log("profit", profit)
        // console.log("price data", priceData)
        onDataFetched(strategy);
        }
        catch (e) {
            console.info("ligma", e);
        }
    }
  }, [erc20TokenAddress,contractState,
     erc20Balance, stablecoinAddress, stablecoinBalance, trailAmount, uniswapPool, granularity, manager, 
     tslThreshold, deployEvent, thresholdUpdates, fundsDeposited]);

  return;
};

export default useStrategyData;
