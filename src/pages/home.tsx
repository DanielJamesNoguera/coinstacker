import React, { useEffect, useState, useRef } from 'react';
declare global {
  interface Window {
    fetchPricesInterval?: number;
  }
}

const Home = () => {
  const [pairInfo, setPairInfo] = useState([] as {
    symbol: string, 
    price: number | null, 
    price1minAgo: number | null, 
    price2minAgo: number | null,
    open: boolean,
    openPrice: number | null,
    maxPriceDuringOpen: number | null,
    minPriceDuringOpen: number | null,
    closePrice: number | null,
  }[]);

  const [closedPositions, setClosedPositions] = useState([] as {
    symbol: string, 
    openPrice: number | null,
    closePrice: number | null,
  }[]);
  const [totalPNL, setTotalPNL] = useState(0);
  const [winPercentage, setWinPercentage] = useState(0);
  const closedPositionsRef = useRef<{ symbol: string, openPrice: number | null, closePrice: number }[]>([]);

  useEffect(() => {
    if (window.fetchPricesInterval) return;

    const fetchPrices = async (symbols: string[]) => {
      console.log('Fetching prices...')
      try {
        const endpoint = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`;
    
        const response = await fetch(endpoint);
    
        if (response.ok) {
          const prices = await response.json();
          setPairInfo((currentPairInfo) => {
            return prices.map((price: any) => {
              const previousPriceInfo = currentPairInfo.find(pair => pair.symbol === price.symbol);
              let change1m = previousPriceInfo && previousPriceInfo.price ? ((price.lastPrice - previousPriceInfo.price) / previousPriceInfo.price) * 100 : null;
              let change2m = previousPriceInfo && previousPriceInfo.price1minAgo ? ((price.lastPrice - previousPriceInfo.price1minAgo) / previousPriceInfo.price1minAgo) * 100 : null;
              let positionIsOpen = previousPriceInfo && previousPriceInfo.open;
              let openPrice = previousPriceInfo?.openPrice || null;
              let maxPriceDuringOpen = previousPriceInfo?.maxPriceDuringOpen || null;
              let minPriceDuringOpen = previousPriceInfo?.minPriceDuringOpen || null;

              if (positionIsOpen) {
                if (!maxPriceDuringOpen || price.lastPrice > maxPriceDuringOpen) maxPriceDuringOpen = price.lastPrice;
                if (!minPriceDuringOpen || price.lastPrice < minPriceDuringOpen) minPriceDuringOpen = price.lastPrice;

                let positionPNL = openPrice ? ((price.lastPrice - openPrice) / openPrice) * 100 : 0;

                // Check if we should close the position
                if ((maxPriceDuringOpen && price.lastPrice < maxPriceDuringOpen * 0.95) || positionPNL > 1 || positionPNL < -1) {
                  if (!closedPositionsRef.current.some(pos => pos.symbol === price.symbol)) {
                    positionIsOpen = false;
    
                    const closedPosition = { 
                      symbol: price.symbol, 
                      openPrice: openPrice, 
                      closePrice: price.lastPrice 
                    };
    
                    // Push to the ref array to mark as in process of closing
                    closedPositionsRef.current.push(closedPosition);
    
                    setClosedPositions((currentClosedPositions) => [...currentClosedPositions, closedPosition]);
                  }
                }
              }
              else {
                // Check if we should open a position
                if ((change1m && change1m > 0.1) || (change2m && change2m > 0.1)) {
                  positionIsOpen = true;
                  openPrice = price.lastPrice;
                  maxPriceDuringOpen = price.lastPrice;
                }
              }
              return {
                symbol: price.symbol, 
                price: price.lastPrice, 
                price1minAgo: previousPriceInfo?.price || null, 
                price2minAgo: previousPriceInfo?.price1minAgo || null,
                open: positionIsOpen,
                openPrice: openPrice,
                maxPriceDuringOpen: maxPriceDuringOpen,
                minPriceDuringOpen: minPriceDuringOpen,
              };
            });
          });
        } else {
          throw new Error('Network response was not ok.');
        }
      } catch (error) {
        console.error('There was a problem fetching price data:', error);
      }
    };
    
    window.fetchPricesInterval = window.setInterval(() => fetchPrices(['BTCUSDT', 'ETHUSDT', 'BNBUSDT']), 60000);
      
      // Clear the interval on component unmount
      return () => {
        clearInterval(window.fetchPricesInterval);
        window.fetchPricesInterval = undefined;
      };
  }, []);

  const outputPriceChange = (value: number | null, currentPrice: number | null) => {
    if (!value || !currentPrice) return '-';
    const change = currentPrice - value;
    const changePercentage = (change / value) * 100;
    return `${change > 0 ? '+' : ""}${change.toFixed(2)} (${changePercentage.toFixed(2)}%)`;
  }

  useEffect(() => {
    for (let position of closedPositions) {
      if (!position.openPrice || !position.closePrice) continue;
      let pnl = ((position.closePrice - position.openPrice) / position.openPrice) * 100;
      setTotalPNL((currentTotalPNL) => currentTotalPNL + pnl);
    }

    let winCount = closedPositions.filter(position => (position.closePrice && position.openPrice) && (position.closePrice > position.openPrice)).length;
    let winPercentage = (winCount / closedPositions.length) * 100;
    setWinPercentage(winPercentage);
  }, [closedPositions]);
  
  return (
    <div className="w-screen flex flex-col items-center py-12">
      <div className="max-w-[1100px] w-full flex flex-col gap-10">

        <div className="w-full grid md:grid-cols-3 gap-6">
          <div className="w-full rounded-xl border-2 border-white bg-black p-6 text-white text-center">
            <p className="uppercase">Trades</p>
            <h3 className="text-2xl font-bold">{closedPositions.length}</h3>
          </div>

          <div className="w-full rounded-xl border-2 border-white bg-black p-6 text-white text-center">
            <p className="uppercase">PNL</p>
            <h3 className="text-2xl font-bold">{totalPNL ? `${totalPNL}%` : "-"}</h3>
          </div>

          <div className="w-full rounded-xl border-2 border-white bg-black p-6 text-white text-center">
            <p className="uppercase">Win Rate</p>
            <h3 className="text-2xl font-bold">{winPercentage ? `${winPercentage}%` : "-"}</h3>
          </div>
        </div>

        <div className="w-full rounded-xl border-2 border-white bg-black p-6">
          <h2 className="text-white text-2xl font-bold">Closed Positions</h2>

          <table className="w-full mt-6">
            <thead>
              <tr>
                <th className="text-white text-left">Pair</th>
                <th className="text-white text-left">Entry Price</th>
                <th className="text-white text-left">Close Price</th>
                <th className="text-white text-left">PNL %</th>
              </tr>
            </thead>
            <tbody>
              {closedPositions.map(pair => (
                <tr key={pair.symbol + pair.openPrice}>
                  <td className="text-white">{pair.symbol}</td>
                  <td className="text-white">${Number(pair.openPrice).toFixed(2)}</td>
                  <td className="text-white">${Number(pair.closePrice).toFixed(2)}</td>
                  <td className="text-white">{(pair.openPrice && pair.closePrice) ? (((pair.closePrice - pair.openPrice) / pair.openPrice) * 100).toFixed(2) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="w-full rounded-xl border-2 border-white bg-black p-6">
          <h2 className="text-white text-2xl font-bold">Open Positions</h2>

          <table className="w-full mt-6">
            <thead>
              <tr>
                <th className="text-white text-left">Pair</th>
                <th className="text-white text-left">Price</th>
                <th className="text-white text-left">Entry Price</th>
                <th className="text-white text-left">PNL %</th>
              </tr>
            </thead>
            <tbody>
              {pairInfo.filter(pair => pair.open).map(pair => (
                <tr key={pair.symbol + "open"}>
                  <td className="text-white">{pair.symbol}</td>
                  <td className="text-white">${Number(pair.price).toFixed(2)}</td>
                  <td className="text-white">${Number(pair.openPrice).toFixed(2)}</td>
                  <td className="text-white">{(pair.price && pair.openPrice) ? (((pair.price - pair.openPrice) / pair.openPrice) * 100).toFixed(2) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="w-full rounded-xl border-2 border-white bg-black p-6">
          <h2 className="text-white text-2xl font-bold">Tracked Pairs</h2>

          <table className="w-full mt-6">
            <thead>
              <tr>
                <th className="text-white text-left">Pair</th>
                <th className="text-white text-left">Price</th>
                <th className="text-white text-left">Price 1m ago</th>
                <th className="text-white text-left">1m Change</th>
                <th className="text-white text-left">Price 2m ago</th>
                <th className="text-white text-left">2m Change</th>
              </tr>
            </thead>
            <tbody>
              {pairInfo.map(pair => (
                <tr key={pair.symbol + "info"}>
                  <td className="text-white">{pair.symbol}</td>
                  <td className="text-white">${Number(pair.price).toFixed(2)}</td>
                  <td className="text-white">{pair.price1minAgo ? `$${Number(pair.price1minAgo).toFixed(2)}` : "-"}</td>
                  <td className="text-white">{outputPriceChange(pair.price1minAgo, pair.price)}</td>
                  <td className="text-white">{pair.price2minAgo ? `$${Number(pair.price2minAgo).toFixed(2)}` : "-"}</td>
                  <td className="text-white">{outputPriceChange(pair.price2minAgo, pair.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Home;