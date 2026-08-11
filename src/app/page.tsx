'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Shield, Tent, Package, Navigation, Loader2 } from 'lucide-react';
import bcrypt from 'bcryptjs';

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  sort_order: number;
}

interface SelectedItem {
  clientId: string; // client-side unique id to distinguish duplicate items
  name: string;
  category: string;
  catalog_item_id: string | null;
  source: 'recommended' | 'custom';
}

const ITEM_COLORS = [
  '#FCE7F3', // Pink
  '#EDE9FE', // Purple/Violet
  '#DBEAFE', // Blue
  '#CFFAFE', // Cyan
  '#CCFBF1', // Teal
  '#D1FAE5', // Green/Emerald
  '#FEF3C7', // Yellow/Amber
  '#FFEDD5', // Orange
  '#FFE4E6', // Rose
  '#E0E7FF', // Indigo
];

function getItemColor(name: string): string {
  if (!name) return ITEM_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % ITEM_COLORS.length;
  return ITEM_COLORS[index];
}

const FALLBACK_CATALOG: CatalogItem[] = [
  { id: 'f-sleep-1', name: '텐트', category: '수면/쉘터', sort_order: 1 },
  { id: 'f-sleep-2', name: '타프', category: '수면/쉘터', sort_order: 2 },
  { id: 'f-sleep-3', name: '침낭', category: '수면/쉘터', sort_order: 3 },
  { id: 'f-sleep-4', name: '캠핑매트', category: '수면/쉘터', sort_order: 4 },
  { id: 'f-sleep-5', name: '캠핑베개', category: '수면/쉘터', sort_order: 5 },
  { id: 'f-cook-1', name: '버너', category: '취사/식사', sort_order: 6 },
  { id: 'f-cook-2', name: '코펠 세트', category: '취사/식사', sort_order: 7 },
  { id: 'f-cook-3', name: '아이스박스', category: '취사/식사', sort_order: 8 },
  { id: 'f-cook-4', name: '그리들/팬', category: '취사/식사', sort_order: 9 },
  { id: 'f-cook-5', name: '식기/수저', category: '취사/식사', sort_order: 10 },
  { id: 'f-cook-6', name: '부탄가스/이소가스', category: '취사/식사', sort_order: 11 },
  { id: 'f-light-1', name: '메인 랜턴', category: '조명', sort_order: 12 },
  { id: 'f-light-2', name: '감성 무드등', category: '조명', sort_order: 13 },
  { id: 'f-light-3', name: '헤드랜턴/손전등', category: '조명', sort_order: 14 },
  { id: 'f-light-4', name: '랜턴 스탠드', category: '조명', sort_order: 15 },
  { id: 'f-etc-1', name: '캠핑 의자', category: '기타/리빙', sort_order: 16 },
  { id: 'f-etc-2', name: '캠핑 테이블', category: '기타/리빙', sort_order: 17 },
  { id: 'f-etc-3', name: '멀티탭/선릴', category: '기타/리빙', sort_order: 18 },
  { id: 'f-etc-4', name: '화로대', category: '기타/리빙', sort_order: 19 },
  { id: 'f-etc-5', name: '릴렉스 체어', category: '기타/리빙', sort_order: 20 },
  { id: 'f-etc-6', name: '보조배터리', category: '기타/리빙', sort_order: 21 },
  { id: 'f-etc-7', name: '구급상자', category: '기타/리빙', sort_order: 22 },
  { id: 'f-etc-8', name: '일반/쓰레기 봉투', category: '기타/리빙', sort_order: 23 },
];

function generateShareCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function CreateTripPage() {
  const router = useRouter();

  // Mode state: 'welcome' or 'create'
  const [mode, setMode] = useState<'welcome' | 'create'>('welcome');

  // Form states
  const [tripName, setTripName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  
  // Custom item state
  const [customItemName, setCustomItemName] = useState('');

  // Loading/Error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch Recommended Item Catalog
  useEffect(() => {
    async function loadCatalog() {
      try {
        const { data, error } = await supabase
          .from('item_catalog')
          .select('*')
          .order('sort_order', { ascending: true });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const formatted = data.map((item: any) => ({
            id: item.id,
            name: item.name,
            category: item.category || '기타',
            sort_order: item.sort_order || 99
          }));
          setCatalogItems(formatted);
        } else {
          setCatalogItems(FALLBACK_CATALOG);
        }
      } catch (err) {
        console.warn('DB catalog fetch failed, loading default fallback', err);
        setCatalogItems(FALLBACK_CATALOG);
      }
    }
    loadCatalog();
  }, []);

  // Click handler to select a catalog item (always inserts a separate token button)
  const handleSelectCatalogItem = (item: CatalogItem) => {
    setSelectedItems((prev) => [
      ...prev,
      {
        clientId: Math.random().toString(36).substring(2, 11),
        name: item.name,
        category: item.category,
        catalog_item_id: item.id.startsWith('f-') ? null : item.id,
        source: 'recommended',
      },
    ]);
  };

  // Remove a single specific item button token by clientId
  const handleDelete = (clientId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.clientId !== clientId));
  };

  // Add custom manual item token
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemName.trim()) return;

    setSelectedItems((prev) => [
      ...prev,
      {
        clientId: Math.random().toString(36).substring(2, 11),
        name: customItemName.trim(),
        category: '기타',
        catalog_item_id: null,
        source: 'custom',
      },
    ]);

    setCustomItemName('');
  };

  // Form submission: Save trip
  const handleSaveTrip = async () => {
    if (!tripName.trim()) {
      setErrorMsg('여행 이름을 입력해 주세요.');
      return;
    }
    if (!/^\d{4}$/.test(password)) {
      setErrorMsg('비밀번호는 숫자 4자리로 입력해 주세요.');
      return;
    }
    if (selectedItems.length === 0) {
      setErrorMsg('최소 하나 이상의 공용 장비를 선택해 주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const shareCode = generateShareCode();
      const hashedPassword = bcrypt.hashSync(password, 6).replace(/^\$2b\$/, '$2a$');

      // Insert trip
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .insert({
          name: tripName.trim(),
          organizer_password_hash: hashedPassword,
          share_code: shareCode,
          status: 'active',
        })
        .select()
        .single();

      if (tripError) throw tripError;
      if (!tripData) throw new Error('Trip creation returned empty response.');

      // Insert equipment items (Each selected item gets its own database record with quantity = 1)
      const itemsToInsert = selectedItems.map((item) => ({
        trip_id: tripData.id,
        catalog_item_id: item.catalog_item_id,
        name: item.name,
        total_quantity: 1,
        remaining_quantity: 1,
        source: item.source,
      }));

      const { error: itemsError } = await supabase.from('items').insert(itemsToInsert);

      if (itemsError) throw itemsError;

      router.push(`/trip/${shareCode}`);
    } catch (err: any) {
      console.error('Failed to create trip:', err);
      setErrorMsg(err.message || '여행을 저장하는 중에 오류가 발생했습니다. 환경변수 및 DB 상태를 확인해 주세요.');
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Geometric Poster Backdrop Background */}
      <div className="geometric-bg">
        <div className="geo-shape geo-circle"></div>
        <div className="geo-shape geo-square"></div>
        <div className="geo-shape geo-rect"></div>
      </div>

      {mode === 'welcome' ? (
        <main className="container" style={{ justifyContent: 'center', minHeight: '100vh' }}>
          <div className="flat-card flat-card-white text-center" style={{ padding: '40px 24px' }}>
            <div style={{
              display: 'inline-flex',
              padding: '20px',
              background: 'var(--bg-muted)',
              borderRadius: '50%',
              marginBottom: '24px'
            }}>
              <Tent size={48} style={{ color: 'var(--primary)' }} />
            </div>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
              나누짐 <span style={{ color: 'var(--primary)' }}>Nanujim</span> 🌿
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '32px', wordBreak: 'keep-all' }}>
              함께 떠나는 여행, 공용 장비 부담 나누기.<br />
              여행장 리스트 생성 후 공유 링크 하나로 터치해 분배하세요.
            </p>
            <button 
              className="btn-flat btn-flat-primary" 
              style={{ width: '100%', maxWidth: '280px', height: '56px', fontSize: '1.1rem' }}
              onClick={() => setMode('create')}
            >
              내 여행 만들기 ✈️
            </button>
          </div>
        </main>
      ) : (
        <main className="container">
          <header style={{ marginBottom: '28px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>
              새 여행 공용장비 구성 🎒
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>함께 가져갈 장비 품목과 수량을 등록해 주세요.</p>
          </header>

          {errorMsg && (
            <div className="flat-card animate-pop-in" style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '4px solid var(--danger)', padding: '16px', fontWeight: 700 }}>
              {errorMsg}
            </div>
          )}

          {/* Organizer Password & Trip Details */}
          <section className="flat-card flat-card-white" style={{ padding: '24px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="trip-name">여행 이름</label>
              <input
                id="trip-name"
                type="text"
                className="flat-input"
                placeholder="예: 영월 솔밭 캠핑, 태기산 백패킹"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="org-password" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={16} style={{ color: 'var(--primary)' }} /> 여행장 비밀번호 (숫자 4자리)
              </label>
              <input
                id="org-password"
                type="password"
                className="flat-input"
                placeholder="숫자 4자리"
                maxLength={4}
                pattern="[0-9]*"
                inputMode="numeric"
                value={password}
                onChange={(e) => setPassword(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>
          </section>

          {/* Lists */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Catalog Recommended items */}
            <section className="flat-card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>추천 장비 목록 💡</h2>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {catalogItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectCatalogItem(item)}
                    className="btn-flat btn-flat-secondary flat-card-interactive"
                    style={{
                      height: '40px',
                      padding: '0 18px',
                      fontSize: '0.85rem',
                      background: getItemColor(item.name), 
                      border: '3px solid var(--text-primary)',
                      borderRadius: '9999px' // Clickable pill shape
                    }}
                  >
                    <Plus size={14} style={{ color: 'var(--text-primary)' }} />
                    {item.name}
                  </button>
                ))}
              </div>
            </section>

            {/* Selected Items List */}
            <section className="flat-card flat-card-white" style={{ flexGrow: 1 }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>선택된 공용 장비 목록 ⛺</h2>
              
              {selectedItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                  <Tent size={36} style={{ marginBottom: '8px', opacity: 0.3 }} />
                  <p style={{ fontSize: '0.9rem' }}>추천 목록에서 추가하거나 직접 입력해 주세요. (중복 선택 가능)</p>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '12px' }}>
                    * 아이템을 클릭하면 선택이 바로 취소됩니다.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px' }}>
                    {selectedItems.map((item) => (
                      <button
                        key={item.clientId}
                        onClick={() => handleDelete(item.clientId)}
                        className="btn-flat btn-flat-secondary flat-card-interactive animate-pop-in"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '10px 18px',
                          borderRadius: '9999px', // Clickable pill shape
                          border: '3px solid var(--text-primary)',
                          background: getItemColor(item.name), 
                          width: '100%',
                          minHeight: '44px',
                          textAlign: 'center'
                        }}
                        title="클릭 시 선택 취소"
                      >
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', wordBreak: 'break-all' }}>{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add custom item form */}
              <form onSubmit={handleAddCustomItem} style={{ display: 'flex', gap: '8px', borderTop: '3px solid var(--text-primary)', paddingTop: '20px', marginTop: '16px' }}>
                <input
                  type="text"
                  className="flat-input"
                  style={{ flexGrow: 1, height: '44px', padding: '0 14px', border: '3px solid var(--text-primary)' }}
                  placeholder="직접 입력 (예: 해먹, 전기요)"
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                />
                <button 
                  type="submit" 
                  className="btn-flat btn-flat-primary" 
                  style={{ width: '44px', height: '44px', padding: 0, border: '3px solid var(--text-primary)' }}
                >
                  <Plus size={18} />
                </button>
              </form>
            </section>
          </div>

          {/* Action button */}
          <div style={{ marginTop: '24px', paddingBottom: '40px' }}>
            <button
              className="btn-flat btn-flat-primary"
              style={{ width: '100%', height: '60px', borderRadius: 'var(--radius-md)', fontSize: '1.1rem', gap: '8px', border: '4px solid var(--text-primary)' }}
              disabled={isLoading || !tripName.trim() || password.length !== 4 || selectedItems.length === 0}
              onClick={handleSaveTrip}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> 저장하는 중...
                </>
              ) : (
                <>
                  <Navigation size={16} /> 공용장비 리스트 저장하기
                </>
              )}
            </button>
          </div>
        </main>
      )}
    </>
  );
}
