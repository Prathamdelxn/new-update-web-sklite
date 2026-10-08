const fs = require('fs');

const file = 'c:\\Users\\Mahesh Indalkar\\Desktop\\web\\new-update-web-sklite\\src\\features\\interior-new\\components\\projects\\InteriorProcurementView.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `<table className="w-full text-left text-xs">
                              <thead className="bg-[hsl(var(--muted)/0.3)] border-b border-[hsl(var(--border))] text-[10px] uppercase text-[hsl(var(--muted-foreground))]">
                                <tr>
                                  <th className="p-3 font-bold">Item</th>
                                  <th className="p-3 font-bold border-l border-[hsl(var(--border))] min-w-[100px]">Supplier A<br/><span className="font-normal normal-case text-[9px]">ABC Corp</span></th>
                                  <th className="p-3 font-bold border-l border-[hsl(var(--border))] bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-700 min-w-[100px]">Supplier B<br/><span className="font-normal normal-case text-[9px]">XYZ Build</span></th>
                                  <th className="p-3 font-bold border-l border-[hsl(var(--border))] min-w-[100px]">Supplier C<br/><span className="font-normal normal-case text-[9px]">PQR Traders</span></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[hsl(var(--border))]">
                                {(selectedPo.items && selectedPo.items.length > 0 ? selectedPo.items : [{name: selectedPo.materialName || 'Material', quantity: 1, unit: 'unit'}]).map((item: any, idx: number) => (
                                  <tr key={idx}>
                                    <td className="p-3 font-medium text-[hsl(var(--foreground))]">{item.name} <span className="text-[9px] text-[hsl(var(--muted-foreground))] block mt-0.5">{item.quantity} {item.unit}</span></td>
                                    <td className="p-3 border-l border-[hsl(var(--border))] font-mono">{currencySymbol} {item.unitPrice ? item.unitPrice + 10 : 250}</td>
                                    <td className="p-3 border-l border-[hsl(var(--border))] font-mono text-emerald-600 font-bold bg-emerald-50/30 dark:bg-emerald-950/10">{currencySymbol} {item.unitPrice ? item.unitPrice - 5 : 240}</td>
                                    <td className="p-3 border-l border-[hsl(var(--border))] font-mono">{currencySymbol} {item.unitPrice ? item.unitPrice + 25 : 265}</td>
                                  </tr>
                                ))}
                                <tr className="bg-[hsl(var(--muted)/0.1)]">
                                  <td className="p-3 font-bold text-[hsl(var(--foreground))] text-[10px] uppercase">Total Cost</td>
                                  <td className="p-3 border-l border-[hsl(var(--border))] font-mono font-bold">{currencySymbol} {(selectedPo.amount || 1000) + 500}</td>
                                  <td className="p-3 border-l border-[hsl(var(--border))] font-mono font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20">{currencySymbol} {(selectedPo.amount || 1000) - 200}</td>
                                  <td className="p-3 border-l border-[hsl(var(--border))] font-mono font-bold">{currencySymbol} {(selectedPo.amount || 1000) + 800}</td>
                                </tr>
                                <tr>
                                  <td className="p-3 font-semibold text-[hsl(var(--muted-foreground))] text-[10px]">Delivery Time</td>
                                  <td className="p-3 border-l border-[hsl(var(--border))]">10 Days</td>
                                  <td className="p-3 border-l border-[hsl(var(--border))] bg-emerald-50/30 dark:bg-emerald-950/10 font-bold text-emerald-700">7 Days</td>
                                  <td className="p-3 border-l border-[hsl(var(--border))]">14 Days</td>
                                </tr>
                                <tr>
                                  <td className="p-3 font-semibold text-[hsl(var(--muted-foreground))] text-[10px]">Action</td>
                                  <td className="p-3 border-l border-[hsl(var(--border))]">
                                    <Button size="sm" variant="outline" className="w-full h-7 text-[10px]" onClick={() => handleUpdateVendor('ABC Corp')}>Award</Button>
                                  </td>
                                  <td className="p-3 border-l border-[hsl(var(--border))] bg-emerald-50/30 dark:bg-emerald-950/10">
                                    <Button size="sm" className="w-full h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleUpdateVendor('XYZ Build')}>Award PO</Button>
                                  </td>
                                  <td className="p-3 border-l border-[hsl(var(--border))]">
                                    <Button size="sm" variant="outline" className="w-full h-7 text-[10px]" onClick={() => handleUpdateVendor('PQR Traders')}>Award</Button>
                                  </td>
                                </tr>
                              </tbody>
                            </table>`;

const replacementStr = `<table className="w-full text-left text-xs">
                              <thead className="bg-[hsl(var(--muted)/0.3)] border-b border-[hsl(var(--border))] text-[10px] uppercase text-[hsl(var(--muted-foreground))]">
                                <tr>
                                  <th className="p-3 font-bold">Item</th>
                                  {selectedPo.quotes && selectedPo.quotes.length > 0 ? (
                                    selectedPo.quotes.map((quote: any, idx: number) => {
                                      // Determine if this is the lowest total cost vendor
                                      let isLowest = false;
                                      if (selectedPo.quotes.length > 1) {
                                        const totals = selectedPo.quotes.map((q: any) => 
                                          q.rates.reduce((sum: number, r: any) => {
                                            const item = selectedPo.items?.find((i: any) => i._id === r.itemId || i.name === r.name);
                                            return sum + (r.unitPrice * (item?.quantity || 1));
                                          }, 0)
                                        );
                                        const myTotal = quote.rates.reduce((sum: number, r: any) => {
                                            const item = selectedPo.items?.find((i: any) => i._id === r.itemId || i.name === r.name);
                                            return sum + (r.unitPrice * (item?.quantity || 1));
                                          }, 0);
                                        if (myTotal === Math.min(...totals) && myTotal > 0) isLowest = true;
                                      }

                                      return (
                                        <th key={idx} className={\`p-3 font-bold border-l border-[hsl(var(--border))] min-w-[100px] \${isLowest ? 'bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-700' : ''}\`}>
                                          Supplier \${idx + 1}<br/>
                                          <span className="font-normal normal-case text-[9px]">{quote.vendorName}</span>
                                        </th>
                                      )
                                    })
                                  ) : (
                                    <th className="p-3 font-bold border-l border-[hsl(var(--border))] min-w-[100px] italic text-[hsl(var(--muted-foreground))]">No quotes yet</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[hsl(var(--border))]">
                                {(selectedPo.items && selectedPo.items.length > 0 ? selectedPo.items : [{_id: 'item-1', name: selectedPo.materialName || 'Material', quantity: 1, unit: 'unit'}]).map((item: any, idx: number) => (
                                  <tr key={idx}>
                                    <td className="p-3 font-medium text-[hsl(var(--foreground))]">{item.name} <span className="text-[9px] text-[hsl(var(--muted-foreground))] block mt-0.5">{item.quantity} {item.unit}</span></td>
                                    {selectedPo.quotes && selectedPo.quotes.length > 0 ? (
                                      selectedPo.quotes.map((quote: any, qIdx: number) => {
                                        const rate = quote.rates?.find((r: any) => r.itemId === item._id || r.name === item.name);
                                        return (
                                          <td key={qIdx} className="p-3 border-l border-[hsl(var(--border))] font-mono">
                                            {rate ? \`\${currencySymbol} \${rate.unitPrice}\` : 'N/A'}
                                          </td>
                                        );
                                      })
                                    ) : (
                                      <td className="p-3 border-l border-[hsl(var(--border))] font-mono text-[hsl(var(--muted-foreground))]">-</td>
                                    )}
                                  </tr>
                                ))}
                                
                                {selectedPo.quotes && selectedPo.quotes.length > 0 && (
                                  <>
                                    <tr className="bg-[hsl(var(--muted)/0.1)]">
                                      <td className="p-3 font-bold text-[hsl(var(--foreground))] text-[10px] uppercase">Total Cost</td>
                                      {selectedPo.quotes.map((quote: any, qIdx: number) => {
                                        const myTotal = quote.rates.reduce((sum: number, r: any) => {
                                            const item = selectedPo.items?.find((i: any) => i._id === r.itemId || i.name === r.name);
                                            return sum + (r.unitPrice * (item?.quantity || 1));
                                        }, 0);
                                        
                                        const totals = selectedPo.quotes.map((q: any) => 
                                          q.rates.reduce((sum: number, r: any) => {
                                            const it = selectedPo.items?.find((i: any) => i._id === r.itemId || i.name === r.name);
                                            return sum + (r.unitPrice * (it?.quantity || 1));
                                          }, 0)
                                        );
                                        const isLowest = (myTotal === Math.min(...totals) && myTotal > 0 && selectedPo.quotes.length > 1);

                                        return (
                                          <td key={qIdx} className={\`p-3 border-l border-[hsl(var(--border))] font-mono font-bold \${isLowest ? 'text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20' : ''}\`}>
                                            {currencySymbol} {myTotal.toLocaleString()}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                    <tr>
                                      <td className="p-3 font-semibold text-[hsl(var(--muted-foreground))] text-[10px]">Action</td>
                                      {selectedPo.quotes.map((quote: any, qIdx: number) => {
                                        const myTotal = quote.rates.reduce((sum: number, r: any) => {
                                            const item = selectedPo.items?.find((i: any) => i._id === r.itemId || i.name === r.name);
                                            return sum + (r.unitPrice * (item?.quantity || 1));
                                        }, 0);
                                        
                                        const totals = selectedPo.quotes.map((q: any) => 
                                          q.rates.reduce((sum: number, r: any) => {
                                            const it = selectedPo.items?.find((i: any) => i._id === r.itemId || i.name === r.name);
                                            return sum + (r.unitPrice * (it?.quantity || 1));
                                          }, 0)
                                        );
                                        const isLowest = (myTotal === Math.min(...totals) && myTotal > 0 && selectedPo.quotes.length > 1);

                                        return (
                                          <td key={qIdx} className={\`p-3 border-l border-[hsl(var(--border))] \${isLowest ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}\`}>
                                            <Button 
                                              size="sm" 
                                              variant={isLowest ? 'default' : 'outline'} 
                                              className={\`w-full h-7 text-[10px] \${isLowest ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}\`}
                                              onClick={() => handleUpdateVendor(quote.vendorName)}
                                            >
                                              {isLowest ? 'Award PO' : 'Award'}
                                            </Button>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  </>
                                )}
                              </tbody>
                            </table>`;

if (content.includes('Supplier A<br/><span className="font-normal normal-case text-[9px]">ABC Corp</span>')) {
    content = content.replace(targetStr, replacementStr);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Successfully patched the comparison table');
} else {
    console.log('Could not find the target string');
}
