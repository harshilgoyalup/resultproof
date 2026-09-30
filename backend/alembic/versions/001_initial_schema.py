"""001_initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-30 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. institutes table
    op.create_table(
        'institutes',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('city', sa.String(length=100), nullable=False),
        sa.Column('exams', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_institutes_name'), 'institutes', ['name'], unique=False)
    op.create_index(op.f('ix_institutes_city'), 'institutes', ['city'], unique=False)

    # 2. admins table
    op.create_table(
        'admins',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_admins_email'), 'admins', ['email'], unique=True)

    # 3. submissions table (Zero student names or phone numbers)
    op.create_table(
        'submissions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('institute_id', sa.String(length=36), nullable=False),
        sa.Column('exam', sa.String(length=50), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('course_type', sa.String(length=50), nullable=False),
        sa.Column('duration_months', sa.Integer(), nullable=False),
        sa.Column('is_paid', sa.Boolean(), nullable=False),
        sa.Column('fee_paid', sa.Float(), nullable=False),
        sa.Column('result_value', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('reject_reason', sa.Text(), nullable=True),
        sa.Column('receipt_file_key', sa.String(length=255), nullable=True),
        sa.Column('scorecard_file_key', sa.String(length=255), nullable=True),
        sa.Column('receipt_hash', sa.String(length=64), nullable=False),
        sa.Column('is_duplicate_flag', sa.Boolean(), nullable=False),
        sa.Column('consent_given_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reviewed_by', sa.String(length=36), nullable=True),
        sa.Column('documents_purged_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['institute_id'], ['institutes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['admins.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_submissions_institute_id'), 'submissions', ['institute_id'], unique=False)
    op.create_index(op.f('ix_submissions_exam'), 'submissions', ['exam'], unique=False)
    op.create_index(op.f('ix_submissions_year'), 'submissions', ['year'], unique=False)
    op.create_index(op.f('ix_submissions_status'), 'submissions', ['status'], unique=False)
    op.create_index(op.f('ix_submissions_receipt_hash'), 'submissions', ['receipt_hash'], unique=False)
    op.create_index(op.f('ix_submissions_created_at'), 'submissions', ['created_at'], unique=False)
    op.create_index('idx_duplicate_check', 'submissions', ['institute_id', 'exam', 'year', 'result_value', 'receipt_hash'], unique=False)

    # 4. admin_logs table
    op.create_table(
        'admin_logs',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('admin_id', sa.String(length=36), nullable=False),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('target_id', sa.String(length=100), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['admin_id'], ['admins.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_admin_logs_admin_id'), 'admin_logs', ['admin_id'], unique=False)
    op.create_index(op.f('ix_admin_logs_action'), 'admin_logs', ['action'], unique=False)
    op.create_index(op.f('ix_admin_logs_target_id'), 'admin_logs', ['target_id'], unique=False)
    op.create_index(op.f('ix_admin_logs_created_at'), 'admin_logs', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_table('admin_logs')
    op.drop_table('submissions')
    op.drop_table('admins')
    op.drop_table('institutes')
