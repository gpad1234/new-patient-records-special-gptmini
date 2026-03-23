import React from 'react';
import config from '../config';
import './AIResearch.css';

export default function AIResearchJournal() {
  const cls = config.SHOW_RESEARCH ? 'ai-research-container' : 'ai-research-disabled';
  return (
    <div className={cls} style={{padding: '1rem'}}>
      <h3>AI Research Journal (disabled)</h3>
      <p>Archived for the slim pilot. Re-enable in <code>src/config.js</code>.</p>
    </div>
  );
}
