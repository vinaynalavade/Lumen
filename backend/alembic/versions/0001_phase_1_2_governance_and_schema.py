"""Phase 1.2 schema migration and safe upgrade for Lumen

Revision ID: 0001_phase1_2_schema
Revises: 
Create Date: 2026-08-27

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision: str = '0001_phase1_2_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def get_inspector():
    bind = op.get_bind()
    return Inspector.from_engine(bind)


def table_exists(table_name: str) -> bool:
    inspector = get_inspector()
    return inspector.has_table(table_name)


def column_exists(table_name: str, column_name: str) -> bool:
    inspector = get_inspector()
    if not inspector.has_table(table_name):
        return False
    columns = [c['name'] for c in inspector.get_columns(table_name)]
    return column_name in columns


def create_enum_if_not_exists(enum_name: str, values: list[str]):
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        val_str = ", ".join(f"'{v}'" for v in values)
        op.execute(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{enum_name.lower()}') THEN
                    CREATE TYPE {enum_name.lower()} AS ENUM ({val_str});
                END IF;
            END$$;
        """)


def upgrade() -> None:
    bind = op.get_bind()
    is_pg = bind.dialect.name == 'postgresql'

    # 1. Enums
    create_enum_if_not_exists('workspacerole', ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])
    create_enum_if_not_exists('projectstatus', ['ACTIVE', 'ARCHIVED'])
    create_enum_if_not_exists('organizationrole', ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])
    create_enum_if_not_exists('testcasetemplate', ['STANDARD', 'SIMPLE'])
    create_enum_if_not_exists('testcasetype', ['FUNCTIONAL', 'SMOKE', 'SANITY', 'REGRESSION', 'INTEGRATION', 'UI', 'API', 'NEGATIVE', 'EDGE_CASE'])
    create_enum_if_not_exists('testcasepriority', ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
    create_enum_if_not_exists('testcaseseverity', ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
    create_enum_if_not_exists('testcasestatus', ['DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED'])
    create_enum_if_not_exists('testcasereviewstatus', ['DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'APPROVED', 'DEPRECATED'])
    create_enum_if_not_exists('testrunstatus', ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ABORTED'])
    create_enum_if_not_exists('executionstatus', ['UNTESTED', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'])
    create_enum_if_not_exists('evidencetype', ['NOTE', 'LOG_TEXT', 'FILE_ATTACHMENT'])

    # 2. Table: users
    if not table_exists('users'):
        op.create_table(
            'users',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('email', sa.String(255), nullable=False, unique=True, index=True),
            sa.Column('hashed_password', sa.String(255), nullable=False),
            sa.Column('full_name', sa.String(255), nullable=False),
            sa.Column('avatar_url', sa.String(512), nullable=True),
            sa.Column('professional_title', sa.String(100), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('is_superuser', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        )
    else:
        if not column_exists('users', 'professional_title'):
            op.add_column('users', sa.Column('professional_title', sa.String(100), nullable=True))

    # 3. Table: organizations
    if not table_exists('organizations'):
        op.create_table(
            'organizations',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('name', sa.String(255), nullable=False),
            sa.Column('slug', sa.String(255), nullable=False, unique=True, index=True),
            sa.Column('description', sa.String(1000), nullable=True),
            sa.Column('owner_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        )

    # 4. Table: organization_members
    if not table_exists('organization_members'):
        op.create_table(
            'organization_members',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('organization_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('role', sa.Enum('OWNER', 'ADMIN', 'MEMBER', 'VIEWER', name='organizationrole', create_type=False) if is_pg else sa.String(50), nullable=False, server_default='MEMBER'),
            sa.Column('invited_by_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('joined_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint('organization_id', 'user_id', name='uq_organization_member'),
        )

    # 5. Table: organization_invites
    if not table_exists('organization_invites'):
        op.create_table(
            'organization_invites',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('organization_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('token', sa.String(128), nullable=False, unique=True, index=True),
            sa.Column('role', sa.Enum('OWNER', 'ADMIN', 'MEMBER', 'VIEWER', name='organizationrole', create_type=False) if is_pg else sa.String(50), nullable=False, server_default='MEMBER'),
            sa.Column('created_by_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('max_uses', sa.Integer(), nullable=False, server_default='1'),
            sa.Column('uses_count', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('is_revoked', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        )

    # 6. Table: organization_join_codes
    if not table_exists('organization_join_codes'):
        op.create_table(
            'organization_join_codes',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('organization_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('code', sa.String(50), nullable=False, unique=True, index=True),
            sa.Column('role', sa.Enum('OWNER', 'ADMIN', 'MEMBER', 'VIEWER', name='organizationrole', create_type=False) if is_pg else sa.String(50), nullable=False, server_default='MEMBER'),
            sa.Column('created_by_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('max_uses', sa.Integer(), nullable=True),
            sa.Column('uses_count', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        )

    # 7. Table: workspaces
    if not table_exists('workspaces'):
        op.create_table(
            'workspaces',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('name', sa.String(255), nullable=False),
            sa.Column('slug', sa.String(255), nullable=False, unique=True, index=True),
            sa.Column('description', sa.String(1000), nullable=True),
            sa.Column('owner_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('organization_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=True, index=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        )
    else:
        if not column_exists('workspaces', 'organization_id'):
            op.add_column('workspaces', sa.Column('organization_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=True))
            op.create_index('ix_workspaces_organization_id', 'workspaces', ['organization_id'])

    # 8. Table: workspace_members
    if not table_exists('workspace_members'):
        op.create_table(
            'workspace_members',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('workspace_id', sa.String(36), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('role', sa.Enum('OWNER', 'ADMIN', 'MEMBER', 'VIEWER', name='workspacerole', create_type=False) if is_pg else sa.String(50), nullable=False, server_default='MEMBER'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint('workspace_id', 'user_id', name='uq_workspace_member'),
        )

    # 9. Table: projects
    if not table_exists('projects'):
        op.create_table(
            'projects',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('workspace_id', sa.String(36), sa.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('name', sa.String(255), nullable=False),
            sa.Column('key', sa.String(20), nullable=False),
            sa.Column('description', sa.String(1000), nullable=True),
            sa.Column('status', sa.Enum('ACTIVE', 'ARCHIVED', name='projectstatus', create_type=False) if is_pg else sa.String(50), nullable=False, server_default='ACTIVE'),
            sa.Column('created_by_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint('workspace_id', 'key', name='uq_workspace_project_key'),
        )

    # 10. Table: test_modules
    if not table_exists('test_modules'):
        op.create_table(
            'test_modules',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('project_id', sa.String(36), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('parent_id', sa.String(36), sa.ForeignKey('test_modules.id', ondelete='SET NULL'), nullable=True, index=True),
            sa.Column('name', sa.String(255), nullable=False),
            sa.Column('description', sa.String(1000), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        )

    # 11. Table: test_cases
    if not table_exists('test_cases'):
        op.create_table(
            'test_cases',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('project_id', sa.String(36), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('module_id', sa.String(36), sa.ForeignKey('test_modules.id', ondelete='SET NULL'), nullable=True, index=True),
            sa.Column('case_number', sa.Integer(), nullable=False),
            sa.Column('key', sa.String(50), nullable=False, index=True),
            sa.Column('title', sa.String(255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('template_type', sa.Enum('STANDARD', 'SIMPLE', name='testcasetemplate', create_type=False) if is_pg else sa.String(50), nullable=False, server_default='STANDARD'),
            sa.Column('test_type', sa.Enum('FUNCTIONAL', 'SMOKE', 'SANITY', 'REGRESSION', 'INTEGRATION', 'UI', 'API', 'NEGATIVE', 'EDGE_CASE', name='testcasetype', create_type=False) if is_pg else sa.String(50), nullable=False, server_default='FUNCTIONAL'),
            sa.Column('priority', sa.Enum('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', name='testcasepriority', create_type=False) if is_pg else sa.String(50), nullable=False, server_default='MEDIUM'),
            sa.Column('severity', sa.Enum('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', name='testcaseseverity', create_type=False) if is_pg else sa.String(50), nullable=False, server_default='MEDIUM'),
            sa.Column('status', sa.Enum('DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED', name='testcasestatus', create_type=False) if is_pg else sa.String(50), nullable=False, server_default='ACTIVE'),
            sa.Column('review_status', sa.Enum('DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'APPROVED', 'DEPRECATED', name='testcasereviewstatus', create_type=False) if is_pg else sa.String(50), nullable=False, server_default='DRAFT'),
            sa.Column('tags', sa.String(500), nullable=True),
            sa.Column('preconditions', sa.Text(), nullable=True),
            sa.Column('test_data', sa.Text(), nullable=True),
            sa.Column('expected_result', sa.Text(), nullable=True),
            sa.Column('estimated_duration_minutes', sa.Integer(), nullable=True),
            sa.Column('created_by_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('updated_by_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('reviewer_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint('project_id', 'case_number', name='uq_project_case_number'),
        )
    else:
        if not column_exists('test_cases', 'test_type'):
            op.add_column('test_cases', sa.Column('test_type', sa.Enum('FUNCTIONAL', 'SMOKE', 'SANITY', 'REGRESSION', 'INTEGRATION', 'UI', 'API', 'NEGATIVE', 'EDGE_CASE', name='testcasetype', create_type=False) if is_pg else sa.String(50), nullable=False, server_default='FUNCTIONAL'))
        if not column_exists('test_cases', 'severity'):
            op.add_column('test_cases', sa.Column('severity', sa.Enum('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', name='testcaseseverity', create_type=False) if is_pg else sa.String(50), nullable=False, server_default='MEDIUM'))
        if not column_exists('test_cases', 'review_status'):
            op.add_column('test_cases', sa.Column('review_status', sa.Enum('DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'APPROVED', 'DEPRECATED', name='testcasereviewstatus', create_type=False) if is_pg else sa.String(50), nullable=False, server_default='DRAFT'))
        if not column_exists('test_cases', 'tags'):
            op.add_column('test_cases', sa.Column('tags', sa.String(500), nullable=True))
        if not column_exists('test_cases', 'reviewer_id'):
            op.add_column('test_cases', sa.Column('reviewer_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))

    # 12. Table: test_case_reviews
    if not table_exists('test_case_reviews'):
        op.create_table(
            'test_case_reviews',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('test_case_id', sa.String(36), sa.ForeignKey('test_cases.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('reviewer_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('status', sa.Enum('DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'APPROVED', 'DEPRECATED', name='testcasereviewstatus', create_type=False) if is_pg else sa.String(50), nullable=False),
            sa.Column('comments', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        )

    # 13. Table: test_case_steps
    if not table_exists('test_case_steps'):
        op.create_table(
            'test_case_steps',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('test_case_id', sa.String(36), sa.ForeignKey('test_cases.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('step_number', sa.Integer(), nullable=False),
            sa.Column('action', sa.Text(), nullable=False),
            sa.Column('expected_result', sa.Text(), nullable=False),
            sa.Column('test_data', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint('test_case_id', 'step_number', name='uq_case_step_number'),
        )
    else:
        if not column_exists('test_case_steps', 'test_data'):
            op.add_column('test_case_steps', sa.Column('test_data', sa.Text(), nullable=True))

    # 14. Table: test_suites
    if not table_exists('test_suites'):
        op.create_table(
            'test_suites',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('project_id', sa.String(36), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('name', sa.String(255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('created_by_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        )

    # 15. Table: test_suite_cases
    if not table_exists('test_suite_cases'):
        op.create_table(
            'test_suite_cases',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('suite_id', sa.String(36), sa.ForeignKey('test_suites.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('test_case_id', sa.String(36), sa.ForeignKey('test_cases.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint('suite_id', 'test_case_id', name='uq_suite_test_case'),
        )

    # 16. Table: test_runs
    if not table_exists('test_runs'):
        op.create_table(
            'test_runs',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('project_id', sa.String(36), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('suite_id', sa.String(36), sa.ForeignKey('test_suites.id', ondelete='SET NULL'), nullable=True, index=True),
            sa.Column('name', sa.String(255), nullable=False),
            sa.Column('environment', sa.String(100), nullable=False, server_default='Staging'),
            sa.Column('status', sa.Enum('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ABORTED', name='testrunstatus', create_type=False) if is_pg else sa.String(50), nullable=False, server_default='IN_PROGRESS'),
            sa.Column('created_by_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('started_by_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('updated_by_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        )
    else:
        if not column_exists('test_runs', 'started_by_id'):
            op.add_column('test_runs', sa.Column('started_by_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))
        if not column_exists('test_runs', 'updated_by_id'):
            op.add_column('test_runs', sa.Column('updated_by_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))

    # 17. Table: test_run_items
    if not table_exists('test_run_items'):
        op.create_table(
            'test_run_items',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('test_run_id', sa.String(36), sa.ForeignKey('test_runs.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('test_case_id', sa.String(36), sa.ForeignKey('test_cases.id', ondelete='SET NULL'), nullable=True, index=True),
            sa.Column('order_index', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('case_key', sa.String(50), nullable=False),
            sa.Column('title', sa.String(255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('preconditions', sa.Text(), nullable=True),
            sa.Column('test_data', sa.Text(), nullable=True),
            sa.Column('expected_result', sa.Text(), nullable=True),
            sa.Column('priority', sa.String(20), nullable=False, server_default='MEDIUM'),
            sa.Column('severity', sa.String(20), nullable=False, server_default='MEDIUM'),
            sa.Column('test_type', sa.String(50), nullable=False, server_default='FUNCTIONAL'),
            sa.Column('tags', sa.String(500), nullable=True),
            sa.Column('status', sa.Enum('UNTESTED', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', name='executionstatus', create_type=False) if is_pg else sa.String(50), nullable=False, server_default='UNTESTED'),
            sa.Column('actual_result', sa.Text(), nullable=True),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('assigned_to_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('executed_by_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('updated_by_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
            sa.Column('execution_started_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('execution_completed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('executed_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('duration_seconds', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        )
    else:
        if not column_exists('test_run_items', 'severity'):
            op.add_column('test_run_items', sa.Column('severity', sa.String(20), nullable=False, server_default='MEDIUM'))
        if not column_exists('test_run_items', 'test_type'):
            op.add_column('test_run_items', sa.Column('test_type', sa.String(50), nullable=False, server_default='FUNCTIONAL'))
        if not column_exists('test_run_items', 'tags'):
            op.add_column('test_run_items', sa.Column('tags', sa.String(500), nullable=True))
        if not column_exists('test_run_items', 'assigned_to_id'):
            op.add_column('test_run_items', sa.Column('assigned_to_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))
        if not column_exists('test_run_items', 'updated_by_id'):
            op.add_column('test_run_items', sa.Column('updated_by_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True))
        if not column_exists('test_run_items', 'execution_started_at'):
            op.add_column('test_run_items', sa.Column('execution_started_at', sa.DateTime(timezone=True), nullable=True))
        if not column_exists('test_run_items', 'execution_completed_at'):
            op.add_column('test_run_items', sa.Column('execution_completed_at', sa.DateTime(timezone=True), nullable=True))

    # 18. Table: test_run_step_results
    if not table_exists('test_run_step_results'):
        op.create_table(
            'test_run_step_results',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('test_run_item_id', sa.String(36), sa.ForeignKey('test_run_items.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('step_number', sa.Integer(), nullable=False),
            sa.Column('action', sa.Text(), nullable=False),
            sa.Column('expected_result', sa.Text(), nullable=False),
            sa.Column('test_data', sa.Text(), nullable=True),
            sa.Column('actual_result', sa.Text(), nullable=True),
            sa.Column('status', sa.Enum('UNTESTED', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', name='executionstatus', create_type=False) if is_pg else sa.String(50), nullable=False, server_default='UNTESTED'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        )
    else:
        if not column_exists('test_run_step_results', 'test_data'):
            op.add_column('test_run_step_results', sa.Column('test_data', sa.Text(), nullable=True))

    # 19. Table: execution_evidences
    if not table_exists('execution_evidences'):
        op.create_table(
            'execution_evidences',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('test_run_item_id', sa.String(36), sa.ForeignKey('test_run_items.id', ondelete='CASCADE'), nullable=False, index=True),
            sa.Column('evidence_type', sa.Enum('NOTE', 'LOG_TEXT', 'FILE_ATTACHMENT', name='evidencetype', create_type=False) if is_pg else sa.String(50), nullable=False, server_default='NOTE'),
            sa.Column('title', sa.String(255), nullable=False),
            sa.Column('content', sa.Text(), nullable=True),
            sa.Column('file_path', sa.String(512), nullable=True),
            sa.Column('file_name', sa.String(255), nullable=True),
            sa.Column('mime_type', sa.String(100), nullable=True),
            sa.Column('file_size_bytes', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        )


def downgrade() -> None:
    pass
