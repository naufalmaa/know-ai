'use client'
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup } from 'react-leaflet'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export default function Operations(){
  const [data,setData]=useState<any|null>(null)
  useEffect(()=>{ fetch(api('/api/metrics/map')).then(r=>r.json()).then(setData) },[])

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Operations Map</h2>
      <div className="h-[70vh] border rounded overflow-hidden">
        <MapContainer center={[4.5,96.5]} zoom={6} style={{height:'100%', width:'100%'}}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
          {data?.blocks?.map((b:any,idx:number)=>{
            const coords = (b.geom.coordinates||[])[0]?.map((p:number[])=>[p[1],p[0]]) || []
            const intensity = Math.min(1, (b.oil||0) / 4_600_000)
            const color = `rgba(0, 120, 255, ${0.2 + 0.5*intensity})`
            return <Polygon key={idx} positions={coords} pathOptions={{color:'#0060ff', fillColor:color, weight:1}}>
              <Popup><b>{b.name}</b><br/>Oil: {Math.round(b.oil||0).toLocaleString()} bbl</Popup>
            </Polygon>
          })}
          {data?.wells?.map((w:any,idx:number)=>{
            const [lng,lat] = w.geom.coordinates
            const radius = 4 + Math.min(10, (w.oil||0) / 500000)
            return <CircleMarker key={idx} center={[lat,lng]} radius={radius} pathOptions={{color:'#ff0060'}}>
              <Popup><b>{w.name}</b><br/>Block: {w.block}<br/>Oil: {Math.round(w.oil||0).toLocaleString()} bbl</Popup>
            </CircleMarker>
          })}
        </MapContainer>
      </div>
    </div>
  )
}
