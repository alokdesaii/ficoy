import { Component, computed, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Employee, employees } from '../employees';

interface OrgNode { e: Employee; children: OrgNode[]; }

@Component({
  selector: 'app-org-chart',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './org-chart.component.html',
  styleUrl: './org-chart.component.scss',
})
export class OrgChartComponent {
  // ponytail: tree built from each employee's reporting manager; swap for the org API if it returns a tree
  roots = computed(() => {
    const list = employees();
    const names = new Set(list.map(e => e.name));
    const build = (e: Employee, seen: Set<string>): OrgNode => ({
      e,
      children: list.filter(c => c.manager === e.name && !seen.has(c.name)).map(c => build(c, new Set([...seen, c.name]))),
    });
    return list.filter(e => !e.manager || !names.has(e.manager)).map(e => build(e, new Set([e.name])));
  });

  collapsed = signal(new Set<string>());
  zoom = signal(1);

  toggle(name: string) {
    this.collapsed.update(s => { const n = new Set(s); n.has(name) ? n.delete(name) : n.add(name); return n; });
  }
  setZoom(d: number) { this.zoom.update(z => Math.min(1.5, Math.max(0.5, +(z + d).toFixed(1)))); }
  reset() { this.zoom.set(1); this.collapsed.set(new Set()); }

  initials(name: string) { return name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase(); }
}
