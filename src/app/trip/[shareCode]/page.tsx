'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/Modal';
import { 
  Crown, Copy, Check, Plus, Minus, Trash2, 
  PlusCircle, LogOut, Loader2, Backpack, Smile, 
  AlertCircle, Tent, Flame, Lightbulb, Package, Shield, Pencil
} from 'lucide-react';

interface Trip {
  id: string;
  name: string;
  share_code: string;
  status: string;
}

interface Item {
  id: string;
  trip_id: string;
  catalog_item_id: string | null;
  name: string;
  total_quantity: number;
  remaining_quantity: number;
  source: string;
  category?: string;
}

interface Participant {
  id: string;
  trip_id: string;
  name: string;
  display_name: string;
  name_seq: number;
}

interface Claim {
  id: string;
  trip_id: string;
  item_id: string;
  participant_id: string;
  quantity: number;
  participant?: Participant;
}

interface UserSession {
  id: string;
  name: string;
  display_name: string;
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

export default function TripPage() {
  const router = useRouter();
  const params = useParams();
  const shareCode = params.shareCode as string;

  // DB States
  const [trip, setTrip] = useState<Trip | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  
  // App States
  const [session, setSession] = useState<UserSession | null>(null);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // Modals
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [selectedPartForLogin, setSelectedPartForLogin] = useState<Participant | null>(null);

  const [isOrgAuthOpen, setIsOrgAuthOpen] = useState(false);
  const [orgPassword, setOrgPassword] = useState('');
  const [orgError, setOrgError] = useState('');
  const [orgLoading, setOrgLoading] = useState(false);

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [addItemName, setAddItemName] = useState('');
  const [addItemQty, setAddItemQty] = useState(1);
  const [addItemCatalogId, setAddItemCatalogId] = useState<string | null>(null);
  const [addItemSource, setAddItemSource] = useState<'recommended' | 'custom'>('custom');
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [addItemError, setAddItemError] = useState('');
  const [addItemLoading, setAddItemLoading] = useState(false);

  // Session keys
  const getSessionKey = useCallback(() => `nanujim_session_${shareCode}`, [shareCode]);
  const getOrgKey = useCallback(() => `nanujim_org_${shareCode}`, [shareCode]);

  // Load Catalog fallback / DB
  useEffect(() => {
    async function loadCatalog() {
      try {
        const { data } = await supabase.from('item_catalog').select('*').order('sort_order', { ascending: true });
        if (data) setCatalogItems(data);
      } catch (err) {
        console.warn('Could not load recommended catalog', err);
      }
    }
    loadCatalog();
  }, []);

  // Fetch all trip details
  const fetchAllData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('share_code', shareCode)
        .single();

      if (tripError || !tripData) {
        throw new Error('여행 정보를 찾을 수 없습니다.');
      }
      setTrip(tripData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('trip_id', tripData.id)
        .order('name', { ascending: true })
        .order('id', { ascending: true });
      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      const { data: partData, error: partError } = await supabase
        .from('participants')
        .select('*')
        .eq('trip_id', tripData.id)
        .order('created_at', { ascending: true });
      if (partError) throw partError;
      setParticipants(partData || []);

      const { data: claimsData, error: claimsError } = await supabase
        .from('claims')
        .select('*')
        .eq('trip_id', tripData.id);
      if (claimsError) throw claimsError;
      
      const claimsWithPart = (claimsData || []).map((claim: any) => ({
        ...claim,
        participant: (partData || []).find((p: any) => p.id === claim.participant_id)
      }));
      setClaims(claimsWithPart);

      setErrorMsg('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [shareCode]);

  // Initial load
  useEffect(() => {
    fetchAllData(true);

    const savedSession = localStorage.getItem(getSessionKey());
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession));
      } catch (e) {
        localStorage.removeItem(getSessionKey());
      }
    }

    const savedOrg = sessionStorage.getItem(getOrgKey());
    if (savedOrg === 'true') {
      setIsOrganizer(true);
    }
  }, [fetchAllData, getSessionKey, getOrgKey]);

  // Realtime updates & polling backup
  useEffect(() => {
    if (!trip) return;

    const channel = supabase
      .channel(`realtime-trip-${trip.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `trip_id=eq.${trip.id}` }, () => {
        fetchAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims', filter: `trip_id=eq.${trip.id}` }, () => {
        fetchAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `trip_id=eq.${trip.id}` }, () => {
        fetchAllData();
      })
      .subscribe();

    const pollInterval = setInterval(() => {
      fetchAllData();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [trip, fetchAllData]);

  // Copy share link helper
  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  // Participant authentication
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginName.trim()) {
      setLoginError('이름을 입력해 주세요.');
      return;
    }
    if (!/^\d{4}$/.test(loginPassword)) {
      setLoginError('비밀번호는 숫자 4자리로 입력해 주세요.');
      return;
    }

    setLoginLoading(true);
    setLoginError('');

    try {
      const { data, error } = await supabase.rpc('upsert_participant', {
        p_trip_id: trip?.id,
        p_name: loginName.trim(),
        p_password: loginPassword,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const { participant_id, display_name } = data[0];
        const userSes: UserSession = {
          id: participant_id,
          name: loginName.trim(),
          display_name: display_name,
        };
        localStorage.setItem(getSessionKey(), JSON.stringify(userSes));
        setSession(userSes);
        setIsLoginOpen(false);
        setLoginName('');
        setLoginPassword('');
        setSelectedPartForLogin(null);
        fetchAllData();
      } else {
        throw new Error('인증에 실패했습니다.');
      }
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || '인증 오류가 발생했습니다. 비밀번호를 다시 확인해 주세요.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(getSessionKey());
    setSession(null);
  };

  // Open password input modal to verify as an existing participant
  const handleOpenLoginForParticipant = (part: Participant) => {
    setSelectedPartForLogin(part);
    setLoginName(part.name);
    setLoginPassword('');
    setLoginError('');
    setIsLoginOpen(true);
  };

  // Open modal to register a new participant
  const handleOpenAddParticipant = () => {
    setSelectedPartForLogin(null);
    setLoginName('');
    setLoginPassword('');
    setLoginError('');
    setIsLoginOpen(true);
  };

  // Claiming items
  const handleClaim = async (item: Item) => {
    if (isOrganizer) {
      const confirmDelete = window.confirm(`정말로 '${item.name}' 장비를 목록에서 영구 삭제하시겠습니까?`);
      if (!confirmDelete) return;

      try {
        await supabase.from('claims').delete().eq('item_id', item.id);
        const { error } = await supabase.from('items').delete().eq('id', item.id);
        if (error) throw error;
        fetchAllData();
      } catch (err: any) {
        console.error(err);
        alert('장비 삭제에 실패했습니다.');
      }
      return;
    }

    if (!session) {
      alert('참석자 이름 옆의 연필 아이콘을 누르거나 하단의 참석자 추가를 눌러 먼저 본인 인증 로그인을 해주세요.');
      return;
    }

    if (item.remaining_quantity <= 0) return;

    try {
      const { data: success, error } = await supabase.rpc('claim_item', {
        p_trip_id: trip?.id,
        p_item_id: item.id,
        p_participant_id: session.id,
        p_quantity: 1
      });

      if (error) throw error;
      if (!success) {
        alert('장비를 찜하는 데 실패했습니다. 남은 수량을 확인해 주세요.');
      }
      fetchAllData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || '찜하기 도중 오류가 발생했습니다.');
    }
  };

  // Adjust personal claim quantities / Cancel claim when button is clicked
  const handleAdjustClaim = async (itemId: string, currentQty: number, delta: number) => {
    if (!session) return;

    try {
      if (delta > 0) {
        const { data: success, error } = await supabase.rpc('claim_item', {
          p_trip_id: trip?.id,
          p_item_id: itemId,
          p_participant_id: session.id,
          p_quantity: 1
        });
        if (error) throw error;
        if (!success) alert('추가 수량 찜하기에 실패했습니다. 잔여 수량을 확인해 주세요.');
      } else {
        // Releases/Cancels the claim
        const claim = claims.find((c) => c.item_id === itemId && c.participant_id === session.id);
        if (!claim) return;

        if (claim.quantity <= 1) {
          const { error: delError } = await supabase.from('claims').delete().eq('id', claim.id);
          if (delError) throw delError;
        } else {
          const { error: updError } = await supabase
            .from('claims')
            .update({ quantity: claim.quantity - 1 })
            .eq('id', claim.id);
          if (updError) throw updError;
        }

        const item = items.find((i) => i.id === itemId);
        if (item) {
          const { error: itemError } = await supabase
            .from('items')
            .update({ remaining_quantity: item.remaining_quantity + 1 })
            .eq('id', itemId);
          if (itemError) throw itemError;
        }
      }
      fetchAllData();
    } catch (err: any) {
      console.error(err);
      alert('찜 선택 취소에 실패했습니다.');
    }
  };

  // Organizer auth submit
  const handleOrgAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgPassword) {
      setOrgError('비밀번호를 입력해 주세요.');
      return;
    }

    setOrgLoading(true);
    setOrgError('');

    try {
      const { data: verified, error } = await supabase.rpc('verify_organizer', {
        p_trip_id: trip?.id,
        p_password: orgPassword,
      });

      if (error) throw error;

      if (verified) {
        setIsOrganizer(true);
        sessionStorage.setItem(getOrgKey(), 'true');
        setIsOrgAuthOpen(false);
        setOrgPassword('');
      } else {
        setOrgError('비밀번호가 일치하지 않습니다.');
      }
    } catch (err: any) {
      console.error(err);
      setOrgError(err.message || '인증 오류가 발생했습니다.');
    } finally {
      setOrgLoading(false);
    }
  };

  const handleToggleOrganizer = () => {
    if (isOrganizer) {
      setIsOrganizer(false);
      sessionStorage.removeItem(getOrgKey());
    } else {
      setIsOrgAuthOpen(true);
    }
  };

  // Organizer: Cancel individual claim
  const handleCancelClaimAdmin = async (claim: Claim) => {
    if (!isOrganizer) return;
    try {
      const { error: delError } = await supabase.from('claims').delete().eq('id', claim.id);
      if (delError) throw delError;

      const item = items.find((i) => i.id === claim.item_id);
      if (item) {
        const { error: itemError } = await supabase
          .from('items')
          .update({ remaining_quantity: item.remaining_quantity + claim.quantity })
          .eq('id', item.id);
        if (itemError) throw itemError;
      }
      fetchAllData();
    } catch (err: any) {
      console.error(err);
      alert('찜 취소 처리에 실패했습니다.');
    }
  };

  // Organizer: Force remove participant
  const handleRemoveParticipantAdmin = async (part: Participant) => {
    if (!isOrganizer) return;
    const confirmDelete = window.confirm(
      `정말로 '${part.display_name}'님을 강제 삭제하시겠습니까?\n이 참여자가 찜한 모든 장비는 수량이 복귀됩니다.`
    );
    if (!confirmDelete) return;

    try {
      const partClaims = claims.filter((c) => c.participant_id === part.id);

      for (const claim of partClaims) {
        const item = items.find((i) => i.id === claim.item_id);
        if (item) {
          await supabase
            .from('items')
            .update({ remaining_quantity: item.remaining_quantity + claim.quantity })
            .eq('id', item.id);
        }
      }

      await supabase.from('claims').delete().eq('participant_id', part.id);
      const { error: delPartError } = await supabase.from('participants').delete().eq('id', part.id);
      if (delPartError) throw delPartError;

      if (session && session.id === part.id) {
        handleLogout();
      }

      fetchAllData();
    } catch (err: any) {
      console.error(err);
      alert('참여자 삭제에 실패했습니다.');
    }
  };

  // Multi-item bulk insert (inserts separate quantity items)
  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addItemName.trim()) {
      setAddItemError('장비 이름을 입력해 주세요.');
      return;
    }
    if (addItemQty <= 0) {
      setAddItemError('수량은 1개 이상 입력해 주세요.');
      return;
    }

    setAddItemLoading(true);
    setAddItemError('');

    try {
      // Bulk insert separate records representing item tokens
      const itemsToInsert = Array.from({ length: addItemQty }).map(() => ({
        trip_id: trip?.id,
        name: addItemName.trim(),
        total_quantity: 1,
        remaining_quantity: 1,
        source: addItemSource,
        catalog_item_id: addItemCatalogId,
      }));

      const { error } = await supabase.from('items').insert(itemsToInsert);

      if (error) throw error;

      setIsAddItemOpen(false);
      setAddItemName('');
      setAddItemQty(1);
      setAddItemCatalogId(null);
      setAddItemSource('custom');
      fetchAllData();
    } catch (err: any) {
      console.error(err);
      setAddItemError('아이템 추가에 실패했습니다.');
    } finally {
      setAddItemLoading(false);
    }
  };

  const handleSelectCatalogInModal = (catItem: any) => {
    setAddItemName(catItem.name);
    setAddItemCatalogId(catItem.id);
    setAddItemSource('recommended');
  };

  if (loading) {
    return (
      <div className="container" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Loader2 size={36} className="animate-spin text-primary" />
        <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>여행 정보를 연결하는 중...</p>
      </div>
    );
  }

  if (errorMsg || !trip) {
    return (
      <div className="container" style={{ justifyContent: 'center', minHeight: '80vh' }}>
        <div className="flat-card flat-card-white text-center" style={{ padding: '36px 20px' }}>
          <AlertCircle size={40} className="text-danger" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>오류가 발생했습니다</h2>
          <p style={{ fontSize: '0.95rem', marginBottom: '20px' }}>{errorMsg || '여행 정보를 찾을 수 없습니다.'}</p>
          <button className="btn-flat btn-flat-secondary" onClick={() => router.push('/')}>
            메인 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  const myClaims = claims.filter((c) => c.participant_id === session?.id);

  return (
    <>
      {/* Geometric Poster Backdrop Background */}
      <div className="geometric-bg">
        <div className="geo-shape geo-circle"></div>
        <div className="geo-shape geo-square"></div>
        <div className="geo-shape geo-rect"></div>
      </div>

      <main className="container">
        {/* 1. Trip Header Poster Block */}
        <header className="flat-card" style={{ padding: '24px', marginBottom: '16px', background: 'var(--primary)', border: '4px solid var(--text-primary)', position: 'relative', overflow: 'hidden' }}>
          
          {/* Organizer Mode trigger */}
          <button 
            onClick={handleToggleOrganizer}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: isOrganizer ? 'var(--accent)' : '#ffffff',
              color: 'var(--text-primary)',
              border: '4px solid var(--text-primary)'
            }}
            className="flat-card-interactive"
            title={isOrganizer ? "여행장 인증 완료 (클릭 시 해제)" : "여행장 인증"}
          >
            <Crown size={18} fill={isOrganizer ? "#ffffff" : "transparent"} />
          </button>

          <span style={{ 
            fontSize: '0.8rem', 
            fontWeight: 800, 
            color: 'var(--text-primary)',
            background: '#ffffff',
            padding: '4px 10px',
            borderRadius: '4px',
            display: 'inline-block',
            marginBottom: '10px',
            border: '2px solid var(--text-primary)'
          }}>
            🏕️ 공용 장비 나누기
          </span>

          <h1 style={{ fontSize: '2rem', marginBottom: '16px', paddingRight: '48px', color: '#ffffff' }}>{trip.name}</h1>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <button 
              className="btn-flat btn-flat-secondary" 
              style={{ height: '36px', padding: '0 12px', fontSize: '0.85rem', gap: '6px', border: '3px solid var(--text-primary)' }}
              onClick={handleCopyLink}
            >
              {linkCopied ? <Check size={14} style={{ color: 'var(--secondary)' }} /> : <Copy size={14} />}
              {linkCopied ? '링크 복사 완료!' : '공유 링크 복사'}
            </button>
          </div>

          {isOrganizer && (
            <div className="animate-pop-in" style={{ 
              marginTop: '16px', 
              background: '#fffbeb', 
              border: '3px solid var(--text-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: '0.85rem',
              color: 'var(--accent-hover)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Shield size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 800 }}>여행장 관리 권한 활성화됨. 참여자 강제 삭제 및 찜 개별 취소가 가능합니다.</span>
            </div>
          )}
        </header>

        {/* 2. Remaining items list */}
        <section className="flat-card flat-card-white">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem' }}>남은 공용 장비 🎒</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>버튼을 클릭하면 내 가방으로 찜해집니다.</p>
            </div>
            <button 
              className="btn-flat btn-flat-secondary" 
              style={{ height: '30px', padding: '0 10px', fontSize: '0.75rem', gap: '4px', border: '3px solid var(--text-primary)' }}
              onClick={() => setIsAddItemOpen(true)}
            >
              <PlusCircle size={12} /> 장비 추가
            </button>
          </div>

          {items.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>등록된 공용 장비가 없습니다.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px' }}>
              {items.map((item) => {
                const isOut = item.remaining_quantity <= 0;
                return (
                  <button
                    key={item.id}
                    disabled={isOut && !isOrganizer}
                    onClick={() => handleClaim(item)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '10px 18px',
                      borderRadius: '9999px', // Pill shape
                      border: isOut ? '0' : '3px solid var(--text-primary)',
                      background: isOut ? 'var(--bg-muted-hover)' : getItemColor(item.name), 
                      cursor: (isOut && !isOrganizer) ? 'not-allowed' : 'pointer',
                      width: '100%',
                      textAlign: 'center',
                      minHeight: '52px'
                    }}
                    className={!isOut ? 'flat-card-interactive-white' : ''}
                  >
                    <span style={{ 
                      fontWeight: 800, 
                      fontSize: '0.85rem', 
                      color: isOut ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: isOut ? 'line-through' : 'none',
                      wordBreak: 'break-all'
                    }}>
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>


        {/* 4. Live allocation cards */}
        <section className="flat-card flat-card-white">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>실시간 배분 현황 👥</h2>

          {participants.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0' }}>아직 참여자가 없습니다.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {participants.map((part) => {
                const partClaims = claims.filter((c) => c.participant_id === part.id);
                const isSelf = session && session.id === part.id;
                
                return (
                  <div 
                    key={part.id} 
                    style={{ 
                      border: '4px solid',
                      borderColor: isSelf ? 'var(--primary)' : 'var(--text-primary)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '12px 16px',
                      background: isSelf ? 'rgba(59, 130, 246, 0.04)' : 'var(--bg-muted)',
                    }}
                    className="animate-pop-in"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Smile size={16} style={{ color: isSelf ? 'var(--primary)' : 'var(--text-secondary)' }} />
                        {part.display_name} 
                        {isSelf ? (
                          <>
                            <span style={{ 
                              fontSize: '0.75rem', 
                              fontWeight: 800, 
                              color: '#ffffff', 
                              background: 'var(--primary)', 
                              padding: '2px 8px', 
                              borderRadius: '4px',
                              border: '1px solid var(--text-primary)'
                            }}>
                              나
                            </span>
                            <button
                              onClick={handleLogout}
                              style={{
                                background: 'var(--primary)',
                                color: '#ffffff',
                                border: '2px solid var(--text-primary)',
                                borderRadius: '9999px',
                                padding: '2px 10px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                              className="flat-card-interactive"
                              title="선택 완료 및 저장"
                            >
                              저장하기
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleOpenLoginForParticipant(part)}
                            style={{
                              background: 'transparent',
                              color: 'var(--text-secondary)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '4px',
                              cursor: 'pointer',
                            }}
                            className="flat-card-interactive"
                            title="이 참여자로 인증 로그인"
                          >
                            <Pencil size={12} />
                          </button>
                        )}
                      </span>

                      {isOrganizer && (
                        <button 
                          onClick={() => handleRemoveParticipantAdmin(part)}
                          style={{ height: '28px', padding: '0 8px', fontSize: '0.8rem', borderRadius: '4px' }}
                          className="btn-flat btn-flat-danger"
                        >
                          <Trash2 size={12} /> 강제 삭제
                        </button>
                      )}
                    </div>

                    {partClaims.length === 0 ? (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>아직 선택한 장비가 없습니다.</span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {partClaims.map((claim) => {
                          const item = items.find((i) => i.id === claim.item_id);
                          if (!item) return null;
                          return (
                            <div 
                              key={claim.id} 
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '6px',
                                background: getItemColor(item.name), 
                                borderRadius: '9999px', // Pill shape
                                padding: '4px 12px',
                                fontSize: '0.8rem',
                                border: '2px solid var(--text-primary)'
                              }}
                            >
                              <span style={{ fontWeight: 700 }}>
                                {item.name}
                              </span>
                              {(isSelf || isOrganizer) && (
                                <button 
                                  onClick={() => isSelf ? handleAdjustClaim(item.id, claim.quantity, -1) : handleCancelClaimAdmin(claim)}
                                  style={{ 
                                    color: 'var(--danger)', 
                                    padding: '2px', 
                                    borderRadius: '50%',
                                    background: 'var(--danger-light)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '2px solid var(--danger)',
                                    cursor: 'pointer',
                                    marginLeft: '4px'
                                  }}
                                  className="flat-card-interactive"
                                  title={isSelf ? "찜 반납하기" : "찜 강제 취소"}
                                >
                                  <Minus size={10} style={{ color: 'var(--danger)' }} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Participant Trigger Button at the bottom of the section */}
          <div style={{ marginTop: '16px', borderTop: '3px solid var(--text-primary)', paddingTop: '16px' }}>
            <button
              className="btn-flat btn-flat-secondary flat-card-interactive"
              style={{
                width: '100%',
                height: '44px',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                border: '3px solid var(--text-primary)',
                background: '#ffffff',
                borderRadius: '9999px' // Clickable pill shape
              }}
              onClick={handleOpenAddParticipant}
            >
              <PlusCircle size={14} /> 참석자 추가
            </button>
          </div>
        </section>

        {/* MODAL 1: Login / Join */}
        <Modal 
          isOpen={isLoginOpen} 
          onClose={() => {
            setIsLoginOpen(false);
            setSelectedPartForLogin(null);
          }} 
          title={selectedPartForLogin ? `${selectedPartForLogin.display_name} 인증` : "참석자 추가"}
        >
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loginError && (
              <div style={{ background: 'var(--danger-light)', border: '3px solid var(--danger)', color: 'var(--danger)', padding: '10px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 600 }}>
                {loginError}
              </div>
            )}

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {selectedPartForLogin 
                ? "참석자 등록 당시 설정했던 숫자 4자리 비밀번호를 입력해 주세요."
                : "이름과 4자리 비밀번호를 입력해 주세요. 신규 추가 시 이모지가 자동으로 생성됩니다."}
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="login-name">이름</label>
              <input 
                id="login-name"
                type="text" 
                className="flat-input" 
                placeholder="예: 민수, 지혜"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                disabled={!!selectedPartForLogin} // Prefilled and disabled when logging in via Pencil icon
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">비밀번호 (숫자 4자리)</label>
              <input 
                id="login-password"
                type="password" 
                className="flat-input" 
                placeholder="숫자 4자리"
                maxLength={4}
                pattern="[0-9]*"
                inputMode="numeric"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value.replace(/[^0-9]/g, ''))}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn-flat btn-flat-primary" 
              style={{ width: '100%', height: '52px', marginTop: '8px' }}
              disabled={loginLoading}
            >
              {loginLoading ? <Loader2 size={16} className="animate-spin" /> : '인증 완료 및 입장'}
            </button>
          </form>
        </Modal>

        {/* MODAL 2: Organizer Authentication */}
        <Modal isOpen={isOrgAuthOpen} onClose={() => setIsOrgAuthOpen(false)} title="여행장 인증">
          <form onSubmit={handleOrgAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {orgError && (
              <div style={{ background: 'var(--danger-light)', border: '3px solid var(--danger)', color: 'var(--danger)', padding: '10px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 600 }}>
                {orgError}
              </div>
            )}

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              여행 생성 시 설정했던 숫자 4자리 비밀번호를 입력해 주세요.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="org-pass-auth">비밀번호 (숫자 4자리)</label>
              <input 
                id="org-pass-auth"
                type="password" 
                className="flat-input" 
                placeholder="숫자 4자리"
                maxLength={4}
                pattern="[0-9]*"
                inputMode="numeric"
                value={orgPassword}
                onChange={(e) => setOrgPassword(e.target.value.replace(/[^0-9]/g, ''))}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn-flat btn-flat-primary" 
              style={{ width: '100%', height: '48px', marginTop: '8px' }}
              disabled={orgLoading}
            >
              {orgLoading ? <Loader2 size={16} className="animate-spin" /> : '인증하기'}
            </button>
          </form>
        </Modal>

        {/* MODAL 3: Add Item */}
        <Modal isOpen={isAddItemOpen} onClose={() => setIsAddItemOpen(false)} title="공용 장비 추가하기">
          <form onSubmit={handleAddItemSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {addItemError && (
              <div style={{ background: 'var(--danger-light)', border: '3px solid var(--danger)', color: 'var(--danger)', padding: '10px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 600 }}>
                {addItemError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="form-label">추천 퀵 선택</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '110px', overflowY: 'auto', padding: '10px', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', border: '3px solid var(--text-primary)' }}>
                {catalogItems.map((catItem) => (
                  <button
                    key={catItem.id}
                    type="button"
                    onClick={() => handleSelectCatalogInModal(catItem)}
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.8rem',
                      borderRadius: '9999px', // Pill shape
                      background: addItemCatalogId === catItem.id ? 'var(--primary)' : getItemColor(catItem.name), 
                      border: '2px solid var(--text-primary)',
                      color: addItemCatalogId === catItem.id ? '#ffffff' : 'var(--text-primary)'
                    }}
                  >
                    {catItem.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="add-item-name">장비 이름</label>
              <input 
                id="add-item-name"
                type="text" 
                className="flat-input" 
                placeholder="직접 입력하거나 위에서 퀵 선택"
                value={addItemName}
                onChange={(e) => {
                  setAddItemName(e.target.value);
                  setAddItemCatalogId(null);
                  setAddItemSource('custom');
                }}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="form-group" style={{ width: '100%' }}>
                <label className="form-label" htmlFor="add-item-qty">수량 (입력한 숫자만큼 개별 버튼이 생성됩니다)</label>
                <input 
                  id="add-item-qty"
                  type="number" 
                  className="flat-input" 
                  min={1}
                  value={addItemQty}
                  onChange={(e) => setAddItemQty(parseInt(e.target.value) || 1)}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-flat btn-flat-primary" 
              style={{ width: '100%', height: '48px', marginTop: '8px' }}
              disabled={addItemLoading}
            >
              {addItemLoading ? <Loader2 size={16} className="animate-spin" /> : '장비 등록'}
            </button>
          </form>
        </Modal>
      </main>
    </>
  );
}
