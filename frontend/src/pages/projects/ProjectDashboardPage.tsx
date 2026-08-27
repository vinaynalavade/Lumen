import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Bug,
  Zap,
  Database,
  Bot,
  BarChart3,
  Play,
  Layers,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { projectApi } from '../../services/projectApi';
import type { Project, ProjectSummary } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

export const ProjectDashboardPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { activeProject, setActiveProject } = useWorkspace();

  const [project, setProject] = useState<Project | null>(activeProject);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProjectData = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const proj = await projectApi.getProject(projectId);
      setProject(proj);
      setActiveProject(proj);

      const sum = await projectApi.getProjectSummary(projectId);
      setSummary(sum);
    } catch (error) {
      console.error('Failed to load project details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  if (isLoading && !project) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={32} className="animate-pulse-glow" color="var(--primary)" />
          <p style={{ marginTop: '12px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Loading Lumen QA Cockpit...
          </p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <Card style={{ textAlign: 'center', padding: '60px 24px' }}>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>Project Not Found</h2>
        <p style={{ color: 'var(--text-muted)', margin: '8px 0 20px' }}>
          The requested QA project does not exist or you do not have access.
        </p>
        <Link to="/projects">
          <Button variant="primary">Return to Projects</Button>
        </Link>
      </Card>
    );
  }

  const modulePillars = [
    {
      title: 'Manual Testing',
      phase: 'Phase 1 Active',
      icon: ClipboardList,
      color: '#4f46e5',
      desc: 'Structured functional test cases, step-by-step execution runs, test suites & historical run archives.',
      status: 'Open Studio',
      statusType: 'pass' as const,
      stat: `${summary?.total_test_cases || 0} Test Cases`,
      link: `/projects/${project.id}/manual/cases`,
    },
    {
      title: 'Defect / Bug Tracking',
      phase: 'Phase 2',
      icon: Bug,
      color: '#ef4444',
      desc: 'Automatic bug generation from failed manual & automated test runs with pre-filled failure evidence.',
      status: 'Upcoming',
      statusType: 'neutral' as const,
      stat: '0 Open Defects',
    },
    {
      title: 'API Testing Engine',
      phase: 'Phase 3',
      icon: Zap,
      color: '#f59e0b',
      desc: 'Postman-style collections, REST endpoints (GET/POST/PUT/DELETE), assertions & response validation.',
      status: 'Upcoming',
      statusType: 'neutral' as const,
      stat: '0 Endpoints',
    },
    {
      title: 'Database Testing',
      phase: 'Phase 4',
      icon: Database,
      color: '#06b6d4',
      desc: 'PostgreSQL validation queries, data assertion rules, and end-to-end API-to-Database field comparison.',
      status: 'Upcoming',
      statusType: 'neutral' as const,
      stat: '0 DB Queries',
    },
    {
      title: 'Automation (Selenium + TestNG)',
      phase: 'Phase 5',
      icon: Bot,
      color: '#8b5cf6',
      desc: 'Java + Maven + Selenium runner trigger, execution log ingest, and synchronized Extent Reports.',
      status: 'Upcoming',
      statusType: 'neutral' as const,
      stat: '0 TestNG Runs',
    },
    {
      title: 'Unified Quality Intelligence',
      phase: 'Phase 7',
      icon: BarChart3,
      color: '#10b981',
      desc: 'Project-level cross-layer quality metrics, pass/fail trends, flakiness radar, and executive summaries.',
      status: 'Upcoming',
      statusType: 'neutral' as const,
      stat: '0 Reports',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Cockpit Top Header */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '300px',
            height: '100%',
            background: 'radial-gradient(circle at 100% 0%, rgba(79, 70, 229, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              fontSize: '1.25rem',
              color: '#ffffff',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            {project.key}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {project.name}
              </h1>
              <Badge variant="pass">{project.status}</Badge>
              <Badge variant="primary">[{project.key}]</Badge>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '600px' }}>
              {project.description || 'Quality workspace initialized for unified test management.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchProjectData}
            leftIcon={<RefreshCw size={14} />}
          >
            Refresh
          </Button>
          <Link to={`/projects/${project.id}/manual/runs`}>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Play size={14} />}
            >
              Start Test Run
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
        }}
      >
        {[
          { label: 'Manual Tests', val: summary?.total_test_cases || 0, icon: ClipboardList, color: 'var(--primary)', link: `/projects/${project.id}/manual/cases` },
          { label: 'Test Runs', val: summary?.total_test_runs || 0, icon: Play, color: 'var(--accent-cyan)', link: `/projects/${project.id}/manual/runs` },
          { label: 'Active Bugs', val: summary?.total_bugs || 0, icon: Bug, color: 'var(--status-fail)' },
          { label: 'API Endpoints', val: summary?.total_api_endpoints || 0, icon: Zap, color: 'var(--status-blocked)' },
          { label: 'DB Validations', val: summary?.total_db_validations || 0, icon: Database, color: '#38bdf8' },
          { label: 'Automation Runs', val: summary?.total_automation_runs || 0, icon: Bot, color: '#a855f7' },
        ].map((metric, i) => {
          const Icon = metric.icon;
          const content = (
            <div
              key={i}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: metric.link ? 'pointer' : 'default',
                transition: 'var(--transition-fast)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                  {metric.label}
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                  {metric.val}
                </div>
              </div>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: metric.color,
                }}
              >
                <Icon size={18} />
              </div>
            </div>
          );

          if (metric.link) {
            return (
              <Link key={i} to={metric.link} style={{ textDecoration: 'none' }}>
                {content}
              </Link>
            );
          }
          return content;
        })}
      </div>

      {/* Connected Architecture Pillars */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Connected Quality Pillars
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Every testing activity in Lumen connects into unified quality traceability.
            </p>
          </div>
          <Badge variant="primary">Roadmap Status</Badge>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {modulePillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <Card
                key={idx}
                onClick={() => {
                  if (pillar.link) navigate(pillar.link);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  cursor: pillar.link ? 'pointer' : 'default',
                  border: pillar.link ? '1px solid rgba(79, 70, 229, 0.3)' : '1px solid var(--border-subtle)',
                  transition: 'var(--transition-fast)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: pillar.color,
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {pillar.title}
                      </h3>
                    </div>
                    <Badge variant={pillar.statusType}>{pillar.phase}</Badge>
                  </div>

                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {pillar.desc}
                  </p>
                </div>

                <div
                  style={{
                    marginTop: '16px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{pillar.stat}</span>
                  <span style={{ color: pillar.link ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {pillar.status} {pillar.link && <ArrowRight size={13} />}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Cross-Testing Philosophy Blueprint */}
      <Card
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <Layers size={18} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Lumen Connected Verification Flow (End-to-End)
          </h3>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
          In subsequent phases, a single business scenario in <strong>{project.name}</strong> will be cross-verified across:
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          {[
            { step: '1. Manual Test (Active)', note: 'Functional flow defined' },
            { step: '2. UI Automation', note: 'Selenium + TestNG executes' },
            { step: '3. API Validation', note: 'REST payload assertion' },
            { step: '4. DB Validation', note: 'PostgreSQL record check' },
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: 'var(--bg-subtle)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                {item.step}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {item.note}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
