import React, { useState } from 'react';

const LegalModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [tab, setTab] = useState('terms');

    if (!isOpen) {
        return (
            <div style={{ textAlign: 'center', marginTop: '3rem', paddingBottom: '2rem' }}>
                <button 
                    onClick={() => setIsOpen(true)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
                >
                    利用規約・プライバシーポリシー (免責事項等)
                </button>
            </div>
        );
    }

    return (
        <div style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                background: 'white', borderRadius: '16px', padding: '2rem',
                width: '100%', maxWidth: '600px', maxHeight: '80vh',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                            onClick={() => setTab('terms')}
                            style={{ background: 'none', border: 'none', fontWeight: tab === 'terms' ? 'bold' : 'normal', color: tab === 'terms' ? '#3B82F6' : '#64748B', cursor: 'pointer', fontSize: '1.1rem' }}
                        >利用規約</button>
                        <button 
                            onClick={() => setTab('privacy')}
                            style={{ background: 'none', border: 'none', fontWeight: tab === 'privacy' ? 'bold' : 'normal', color: tab === 'privacy' ? '#3B82F6' : '#64748B', cursor: 'pointer', fontSize: '1.1rem' }}
                        >プライバシーポリシー</button>
                    </div>
                    <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>✖</button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', lineHeight: '1.8', fontSize: '0.95rem', color: '#334155', paddingRight: '1rem' }}>
                    {tab === 'terms' ? (
                        <>
                            <h3 style={{marginTop:0, color: '#1e293b'}}>利用規約 (Terms of Service)</h3>
                            <p>本Webアプリケーション「Shunkan English」（以下、「本サービス」）は、個人が学習・趣味目的で開発したものです。本サービスを利用することにより、以下の規約に同意したものとみなされます。</p>
                            
                            <h4 style={{marginTop:'1.5rem', color: '#1e293b'}}>第1条（免責事項）</h4>
                            <p>本サービスが提供する生成AIによる英文生成・添削・解説などの出力内容は、必ずしも100%の正確性や妥当性を保証するものではありません。語学学習の参考の一つとしてのみご利用ください。本サービスの利用によって利用者に生じたいかなる損害についても、開発者は一切の責任を負いません。</p>
                            
                            <h4 style={{marginTop:'1.5rem', color: '#1e293b'}}>第2条（サービスの中断・停止・変更）</h4>
                            <p>本サービスは個人の趣味開発システムであるため、事前予告なくシステムのメンテナンス、仕様変更、一時停止、または完全な提供終了を行う場合があります。これにより利用者に不利益が生じた場合でも、一切の責任を負いません。</p>
                            
                            <h4 style={{marginTop:'1.5rem', color: '#1e293b'}}>第3条（禁止事項）</h4>
                            <p>自動プログラム（Bot等）を利用した過剰なリクエスト送信、アプリの通信を解析してAIに対して不適切なプロンプトを投げる行為、その他本サービスのバックエンドサーバーや外部API（Google Gemini）機能に著しい負荷や迷惑をかける行為を固く禁止します。</p>
                        </>
                    ) : (
                        <>
                            <h3 style={{marginTop:0, color: '#1e293b'}}>プライバシーポリシー (Privacy Policy)</h3>
                            <p>本サービスにおける、利用者の情報の取り扱いについて以下の通り定めます。</p>
                            
                            <h4 style={{marginTop:'1.5rem', color: '#1e293b'}}>個人情報の収集について</h4>
                            <p>本サービスでは、氏名、メールアドレス、パスワード等、個人を特定・識別できる個人情報は一切収集しておりません。出題状況や忘却曲線のステータス等の学習履歴は、クラウド上ではなく「現在お使いの端末のブラウザ内部（LocalStorage）」にのみ安全に保存されます。</p>
                            
                            <h4 style={{marginTop:'1.5rem', color: '#1e293b'}}>外部API連携（AI利用）について</h4>
                            <p>本サービスは、ユーザーに応じた問題の自動生成および入力された解答の添削を行う目的で、入力されたテキストデータを外部のAIサービス（Google Gemini API）に送信します。<br/>送信されたデータはGoogle社のプライバシーポリシーに基づいて安全に処理されます。また、入力内容から個人が特定されることはありません。</p>

                            <h4 style={{marginTop:'1.5rem', color: '#1e293b'}}>アクセス解析ツールの利用について</h4>
                            <p>今後のサービス向上のため、本サービスが配置されているホスティング環境（Vercel）の標準機能により、個人を特定しない範囲のアクセス統計（PV数、エラー発生率等）が匿名で計測・利用される場合があります。</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LegalModal;
