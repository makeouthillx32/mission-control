'use client';

import { Smile, Paperclip, Send, X, FileText, Puzzle } from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'react-hot-toast';
import './MessageInput.scss';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AttachmentData {
  url: string;
  type: 'image' | 'file';
  name: string;
  size: number;
}

interface Skill {
  id: string;
  name: string;
  emoji?: string;
  description: string;
  source: string;
}

interface MessageInputProps {
  message: string;
  onSetMessage: (message: string) => void;
  handleSendMessage: (e: React.FormEvent, attachments?: AttachmentData[], skillId?: string) => void;
}

export default function MessageInput({ message, onSetMessage, handleSendMessage }: MessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<AttachmentData[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillsLoaded, setSkillsLoaded] = useState(false);
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');
  const [activeSkill, setActiveSkill] = useState<Skill | null>(null);

  const loadSkills = useCallback(async () => {
    if (skillsLoaded) return;
    try {
      const res = await fetch('/api/skills');
      const data = await res.json();
      setSkills(data.skills || []);
      setSkillsLoaded(true);
    } catch {}
  }, [skillsLoaded]);

  useEffect(() => {
    const words = message.split(' ');
    const last = words[words.length - 1];
    if (last.startsWith('/') && last.length > 1) {
      setSkillSearch(last.slice(1).toLowerCase());
      loadSkills();
      setShowSkillPicker(true);
    } else if (last === '/') {
      setSkillSearch('');
      loadSkills();
      setShowSkillPicker(true);
    } else {
      setShowSkillPicker(false);
      setSkillSearch('');
    }
  }, [message, loadSkills]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSkillPicker(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const filteredSkills = skills.filter(s =>
    !skillSearch ||
    s.name.toLowerCase().includes(skillSearch) ||
    s.id.toLowerCase().includes(skillSearch) ||
    s.description.toLowerCase().includes(skillSearch)
  );

  const pickSkill = (skill: Skill) => {
    setActiveSkill(skill);
    setShowSkillPicker(false);
    const words = message.split(' ');
    if (words[words.length - 1].startsWith('/')) words.pop();
    onSetMessage(words.join(' ').trimEnd() + (words.length > 0 && words[0] !== '' ? ' ' : ''));
    inputRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (selectedFiles.length + files.length > 5) {
      toast.error('Maximum 5 files allowed per message');
      return;
    }
    const valid: File[] = [];
    const previews: AttachmentData[] = [];
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: File too large (max 10MB)`); return; }
      const allowed = ['image/jpeg','image/png','image/gif','image/webp','application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowed.includes(file.type)) { toast.error(`${file.name}: File type not supported`); return; }
      valid.push(file);
      previews.push({
        url: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
        type: file.type.startsWith('image/') ? 'image' : 'file',
        name: file.name,
        size: file.size,
      });
    });
    setSelectedFiles(prev => [...prev, ...valid]);
    setAttachmentPreviews(prev => [...prev, ...previews]);
  };

  const uploadFiles = async (files: File[]): Promise<AttachmentData[]> => {
    setIsUploading(true);
    try {
      return await Promise.all(files.map(async file => {
        const ext = file.name.split('.').pop();
        const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('attachments').upload(name, file, { cacheControl: '3600', upsert: false });
        if (error) throw new Error(`Failed to upload ${file.name}`);
        const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(name);
        return { url: publicUrl, type: file.type.startsWith('image/') ? 'image' as const : 'file' as const, name: file.name, size: file.size };
      }));
    } catch {
      toast.error('Failed to upload files');
      return [];
    } finally {
      setIsUploading(false);
    }
  };

  const clearAttachments = () => {
    setSelectedFiles([]);
    setAttachmentPreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${['B','KB','MB','GB'][i]}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length > 0) {
      const uploaded = await uploadFiles(selectedFiles);
      if (uploaded.length > 0) {
        handleSendMessage(e, uploaded, activeSkill?.id);
        clearAttachments();
        setActiveSkill(null);
      }
    } else {
      handleSendMessage(e, [], activeSkill?.id);
      setActiveSkill(null);
    }
  };

  return (
    <div className="message-input" style={{ position: 'relative' }}>
      {showSkillPicker && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            zIndex: 100,
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '12px 12px 0 0',
            maxHeight: '260px',
            overflowY: 'auto',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.25)',
          }}
        >
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '7px', position: 'sticky', top: 0, backgroundColor: 'var(--card)', zIndex: 1 }}>
            <Puzzle size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Skills{filteredSkills.length > 0 ? ` · ${filteredSkills.length}` : ''}
            </span>
            {skillSearch && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>"{skillSearch}"</span>
            )}
          </div>
          {filteredSkills.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
              {skillsLoaded ? `No skills found${skillSearch ? ` for "${skillSearch}"` : ''}` : 'Loading skills...'}
            </div>
          ) : (
            filteredSkills.map((skill, i) => (
              <button
                key={skill.id}
                onClick={() => pickSkill(skill)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  borderBottom: i < filteredSkills.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent) 8%, transparent)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span style={{ fontSize: '20px', lineHeight: 1.2, flexShrink: 0 }}>{skill.emoji || '🧩'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{skill.name}</span>
                    <span style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '99px',
                      fontWeight: 600,
                      backgroundColor: skill.source === 'workspace' ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--border)',
                      color: skill.source === 'workspace' ? 'var(--accent)' : 'var(--text-muted)',
                    }}>{skill.source}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {skill.description}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {activeSkill && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 12px', borderBottom: '1px solid var(--border)', backgroundColor: 'color-mix(in srgb, var(--accent) 8%, var(--card))' }}>
          <Puzzle size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>{activeSkill.emoji || '🧩'} {activeSkill.name}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeSkill.description}</span>
          <button onClick={() => setActiveSkill(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <X size={13} />
          </button>
        </div>
      )}

      {attachmentPreviews.length > 0 && (
        <div className="attachments-preview">
          <div className="attachments-header">
            <span className="attachments-count">{attachmentPreviews.length} file{attachmentPreviews.length > 1 ? 's' : ''} selected</span>
            <button type="button" onClick={clearAttachments} className="clear-all-attachments" disabled={isUploading}>Clear all</button>
          </div>
          <div className="attachments-grid">
            {attachmentPreviews.map((preview, index) => (
              <div key={index} className="attachment-preview">
                <div className="attachment-preview-content">
                  {preview.type === 'image' ? (
                    <div className="image-preview">
                      <img src={preview.url} alt="Preview" className="preview-image" />
                      <div className="image-info"><span className="file-name">{preview.name}</span><span className="file-size">{formatFileSize(preview.size)}</span></div>
                    </div>
                  ) : (
                    <div className="file-preview">
                      <FileText size={24} className="file-icon" />
                      <div className="file-info"><span className="file-name">{preview.name}</span><span className="file-size">{formatFileSize(preview.size)}</span></div>
                    </div>
                  )}
                  <button type="button" onClick={() => { setSelectedFiles(p => p.filter((_, i) => i !== index)); setAttachmentPreviews(p => p.filter((_, i) => i !== index)); }} className="remove-attachment" disabled={isUploading}><X size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="message-input-form">
        <button type="button" className="message-input-icon emoji-button" title="Add emoji"><Smile size={20} /></button>
        <button
          type="button"
          className="message-input-icon"
          title="Attach skill (or type /)"
          onClick={() => { loadSkills(); setShowSkillPicker(s => !s); }}
          style={{ color: activeSkill ? 'var(--accent)' : undefined, position: 'relative' }}
        >
          <Puzzle size={20} />
          {activeSkill && (
            <span style={{ position: 'absolute', top: 2, right: 2, width: 7, height: 7, borderRadius: '50%', backgroundColor: 'var(--accent)', border: '1.5px solid var(--card)' }} />
          )}
        </button>
        <button type="button" className="message-input-icon attach-button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} title="Attach files"><Paperclip size={20} /></button>
        <input ref={fileInputRef} type="file" accept="image/*,.pdf,.txt,.doc,.docx" onChange={handleFileSelect} multiple style={{ display: 'none' }} />
        <input
          ref={inputRef}
          type="text"
          placeholder={activeSkill ? `Message with ${activeSkill.name}… (/ for skills)` : 'Type a message… (/ for skills)'}
          value={message}
          onChange={e => onSetMessage(e.target.value)}
          className="message-input-field"
          disabled={isUploading}
        />
        <button
          type="submit"
          disabled={(!message.trim() && selectedFiles.length === 0) || isUploading}
          className={`send-button ${(message.trim() || selectedFiles.length > 0) && !isUploading ? 'active' : 'disabled'}`}
          title={isUploading ? 'Uploading...' : 'Send message'}
        >
          {isUploading ? <div className="spinner" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
}