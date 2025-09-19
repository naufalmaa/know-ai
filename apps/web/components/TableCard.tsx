export default function TableCard({ table }:{ table:{columns:string[], rows:any[]} }){
  const cols = table.columns || Object.keys(table.rows?.[0]||{})
  return (
    <div className="border rounded overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>{cols.map(c=><th key={c} className="p-2 text-left">{c}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows?.map((r,i)=>(
            <tr key={i} className="border-t">
              {cols.map(c=><td key={c} className="p-2">{String(r[c]??'')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
