import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';

export const NotFoundPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Card style={{ textAlign: 'center', padding: '60px 40px', maxWidth: '440px' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
          404
        </h1>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px' }}>
          Page Not Found
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '8px 0 24px' }}>
          The QA resource or route you requested does not exist.
        </p>
        <Link to="/projects">
          <Button variant="primary">Return to Projects Dashboard</Button>
        </Link>
      </Card>
    </div>
  );
};
