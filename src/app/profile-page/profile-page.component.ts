import { Component, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { employees } from '../employees';
import { CURRENT_USER } from '../leaves';
import { ID_TYPES, IdDoc, idDocs, photo, profileExtras } from '../profile';

@Component({
  selector: 'app-profile-page',
  imports: [DatePipe, FormsModule],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent {
  e = computed(() => employees().find(x => x.name === CURRENT_USER)!);
  x = profileExtras; photo = photo; docs = idDocs; types = ID_TYPES;
  initials = CURRENT_USER.split(' ').map(p => p[0]).join('');
  open = signal(new Set(['personal']));

  // one section at a time: opening one closes the other; clicking the open one collapses it
  toggle(k: string) { this.open.update(s => s.has(k) ? new Set() : new Set([k])); }
  addr = (a: { floor: string; unit: string; building: string; city: string; state: string; country: string; zip: string }) => ({
    line1: [a.floor && `Floor ${a.floor}`, a.unit && `Unit ${a.unit}`, a.building].filter(Boolean).join(', '),
    line2: [a.city, a.state].filter(Boolean).join(', '),
    line3: [a.country, a.zip].filter(Boolean).join(' '),
  });

  pickPhoto(input: HTMLInputElement) {
    const f = input.files?.[0]; input.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/') || f.size > 2 * 1024 * 1024) { alert('Choose an image up to 2MB'); return; }
    const r = new FileReader(); r.onload = () => this.photo.set(String(r.result)); r.readAsDataURL(f);
    // ponytail: preview only; upload to the file API once wired
  }

  // add / edit ID document
  draft = signal<IdDoc | null>(null); editing: IdDoc | null = null; tried = false;
  add() { this.editing = null; this.tried = false; this.draft.set({ type: '', number: '', country: '', file: '' }); }
  edit(d: IdDoc) { this.editing = d; this.tried = false; this.draft.set({ ...d }); }
  pickDoc(input: HTMLInputElement) { const f = input.files?.[0]; if (f) this.draft.update(d => ({ ...d!, file: f.name })); }
  taken = (t: string) => this.docs().some(d => d.type === t && d !== this.editing);
  save() {
    const d = this.draft()!; this.tried = true;
    if (!d.type || !d.number.trim() || !d.country.trim() || !d.file) return;
    this.docs.update(list => this.editing ? list.map(x => x === this.editing ? d : x) : [...list, d]);
    this.x.update(v => ({ ...v, updatedAt: new Date().toISOString() }));
    this.draft.set(null);
  }
  view(d: IdDoc) { alert(`${d.file} (available once the file API is connected)`); }
}
