"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { resolveRegionImage } from "@/lib/region-images";
import type { Region } from "@/lib/types";

export function Regions({ select, selectedId, onSelect }: { select?: boolean; selectedId?: number | null; onSelect?: (id: number) => void }) {
  const [regions,setRegions] = useState<Region[] | null>(null), [error,setError] = useState(false);
  useEffect(() => { fetch("/api/regions").then(r => { if (!r.ok) throw new Error(); return r.json() as Promise<Region[]>; }).then(setRegions).catch(() => setError(true)); }, []);
  if (error) return <div className="error">추천 해역을 불러오지 못했습니다. 새로고침해 다시 시도해 주세요.</div>;
  if (!regions) return <div className="region-grid">{[1,2,3].map(id => <div className="skeleton" key={id}/>)}</div>;
  if (!regions.length) return <div className="state">현재 안내할 해역이 없습니다. 지역 안내를 확인해 주세요.</div>;
  return <div className={`region-grid ${select ? "selectable" : ""}`}>{regions.map(region => {
    const selected = selectedId === region.id;
    return <article className={`region-card ${selected ? "selected" : ""}`} key={region.id}>
      <div className="region-image"><Image src={resolveRegionImage(region.id)} alt={`${region.name}의 분위기를 표현한 대표 해역 이미지`} fill sizes={select ? "(max-width: 680px) 100vw, 260px" : "(max-width: 680px) 100vw, 33vw"}/><span>대표 이미지</span></div>
      <div className="region-body"><div className="region-title"><div><p>{region.area}</p><h2>{region.name}</h2></div><span className="season-chip">{region.season}</span></div><p className="region-note">{region.note}</p><div className="region-footer"><span>{region.latitude.toFixed(2)}° N · {region.longitude.toFixed(2)}° E</span>{select && <button type="button" className={`button ${selected ? "selected-button" : "subtle"}`} onClick={() => onSelect?.(region.id)}>{selected ? "선택됨 ✓" : "이 해역 선택"}</button>}</div></div>
    </article>;
  })}</div>;
}
