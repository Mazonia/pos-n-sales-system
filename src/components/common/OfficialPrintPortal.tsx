import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface OfficialPrintPortalProps {
  children: React.ReactNode;
  active?: boolean;
}

export const OfficialPrintPortal: React.FC<OfficialPrintPortalProps> = ({ children, active = true }) => {
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let node = document.getElementById('official-print-portal');
    if (!node) {
      node = document.createElement('div');
      node.id = 'official-print-portal';
      node.className = 'official-print-portal';
      document.body.appendChild(node);
    }
    setMountNode(node);
  }, []);

  if (!active || !mountNode) return null;

  return createPortal(children, mountNode);
};

/**
 * Universal print trigger helper that injects a clean HTML string or element
 * directly into the body's official print portal and triggers browser printing.
 */
export function triggerOfficialPrint(elementOrHtml: HTMLElement | string) {
  let portal = document.getElementById('official-print-portal');
  if (!portal) {
    portal = document.createElement('div');
    portal.id = 'official-print-portal';
    portal.className = 'official-print-portal';
    document.body.appendChild(portal);
  }

  if (typeof elementOrHtml === 'string') {
    portal.innerHTML = elementOrHtml;
  } else {
    portal.innerHTML = '';
    portal.appendChild(elementOrHtml.cloneNode(true));
  }

  // Small timeout to ensure DOM update is registered before print dialog renders
  setTimeout(() => {
    window.print();
  }, 50);
}

/**
 * Triggers clean printing of the official portal document by temporarily
 * hiding the entire #root application and all screen UI.
 */
export function printOfficialDocument() {
  document.body.classList.add('printing-official');

  const cleanup = () => {
    document.body.classList.remove('printing-official');
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  // Give DOM 60ms to apply .printing-official layout before print dialog freezes execution
  setTimeout(() => {
    window.print();
    // Fallback cleanup if afterprint doesn't fire
    setTimeout(cleanup, 2500);
  }, 60);
}

