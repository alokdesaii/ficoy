import { Directive, ElementRef, OnDestroy, OnInit } from '@angular/core';

// On phones, `<table stack>` shows each row as a card. Copies each <th> text onto its cells as data-label so CSS can show it.
@Directive({ selector: 'table[stack]', host: { class: 'table-stack' } })
export class StackTable implements OnInit, OnDestroy {
  private mo?: MutationObserver;
  constructor(private el: ElementRef<HTMLTableElement>) {}
  ngOnInit() { this.label(); this.mo = new MutationObserver(() => this.label()); this.mo.observe(this.el.nativeElement, { childList: true, subtree: true }); }
  ngOnDestroy() { this.mo?.disconnect(); }
  private label() {
    const t = this.el.nativeElement, heads = [...t.querySelectorAll('thead th')].map(h => h.textContent!.trim());
    t.querySelectorAll('tbody tr').forEach(tr => [...tr.children].forEach((td, i) => { if (td.getAttribute('data-label') !== heads[i]) td.setAttribute('data-label', heads[i] ?? ''); }));
  }
}
