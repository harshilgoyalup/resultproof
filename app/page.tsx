'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ShaderCanvas from '@/components/ShaderCanvas';
import {
  Institute,
  InstituteStats,
  AdminSubmissionDetail,
  SignedDocumentUrls,
  AdminLogItem,
} from '@/lib/types';
import {
  fetchInstitutes,
  createInstitute,
  fetchInstituteStats,
  submitProof,
  requestSubmissionDeletion,
  adminLogin,
  adminGetSubmissions,
  adminGetDocumentUrls,
  adminApproveSubmission,
  adminRejectSubmission,
  adminGetLogs,
} from '@/lib/api';

type PortalView = 'select' | 'university' | 'viewer';

export default function SinglePageResultProof() {
  // Navigation & Role State
  const [activePortal, setActivePortal] = useState<PortalView>('select');

  // University State (Max 4 universities)
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [isLoadingInstitutes, setIsLoadingInstitutes] = useState(false);
  const [newUnivName, setNewUnivName] = useState('');
  const [newUnivCity, setNewUnivCity] = useState('');
  const [newUnivExams, setNewUnivExams] = useState('JEE, NEET');
  const [isRegisteringUniv, setIsRegisteringUniv] = useState(false);
  const [univRegisterMsg, setUnivRegisterMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Viewer State & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedInstitute, setSelectedInstitute] = useState<Institute | null>(null);
  const [instituteStats, setInstituteStats] = useState<InstituteStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Submit Proof Modal State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [submitErrorMsg, setSubmitErrorMsg] = useState<string | null>(null);
  const [submissionForm, setSubmissionForm] = useState({
    institute_id: '',
    exam: 'JEE Advanced',
    year: 2024,
    course_type: 'Classroom',
    duration_months: 24,
    is_paid: true,
    fee_paid: 150000,
    result_value: 'AIR 350',
    consent_given: true,
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [scorecardFile, setScorecardFile] = useState<File | null>(null);

  // Student Right to Deletion Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletionId, setDeletionId] = useState('');
  const [deletionStatus, setDeletionStatus] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // University Admin / Submissions Queue State
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState('admin@resultproof.org');
  const [adminPassword, setAdminPassword] = useState('AdminSecretPass123!');
  const [adminSubmissions, setAdminSubmissions] = useState<AdminSubmissionDetail[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminLogItem[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [rejectPromptId, setRejectPromptId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [signedUrls, setSignedUrls] = useState<{ [id: string]: SignedDocumentUrls }>({});

  const MAX_UNIVERSITIES = 4;

  // Load universities from API
  const loadInstitutes = async () => {
    setIsLoadingInstitutes(true);
    try {
      const data = await fetchInstitutes();
      setInstitutes(data || []);
      if (data && data.length > 0 && !submissionForm.institute_id) {
        setSubmissionForm((prev) => ({ ...prev, institute_id: data[0].id }));
      }
    } catch (err) {
      console.warn('Could not load institutes:', err);
      setInstitutes([]);
    } finally {
      setIsLoadingInstitutes(false);
    }
  };

  useEffect(() => {
    loadInstitutes();
  }, []);

  // Filtered universities in Viewer Portal
  const filteredInstitutes = useMemo(() => {
    return institutes.filter((inst) => {
      const matchesQuery =
        !searchQuery ||
        inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inst.city.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesExam =
        !selectedExam ||
        inst.exams.some((e) => e.toLowerCase().includes(selectedExam.toLowerCase()));
      return matchesQuery && matchesExam;
    });
  }, [institutes, searchQuery, selectedExam]);

  // Handle University Registration (Max 4 limit)
  const handleRegisterUniversity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (institutes.length >= MAX_UNIVERSITIES) {
      setUnivRegisterMsg({
        text: `Maximum limit of ${MAX_UNIVERSITIES} universities reached. Cannot add more.`,
        error: true,
      });
      return;
    }
    if (!newUnivName.trim() || !newUnivCity.trim()) {
      setUnivRegisterMsg({ text: 'Please provide both university name and location.', error: true });
      return;
    }

    setIsRegisteringUniv(true);
    setUnivRegisterMsg(null);

    try {
      const examsArray = newUnivExams
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);

      const created = await createInstitute({
        name: newUnivName.trim(),
        city: newUnivCity.trim(),
        exams: examsArray.length > 0 ? examsArray : ['General Academic'],
      });

      setUnivRegisterMsg({ text: `University "${created.name}" registered successfully! (${institutes.length + 1}/${MAX_UNIVERSITIES})` });
      setNewUnivName('');
      setNewUnivCity('');
      setNewUnivExams('JEE, NEET');
      await loadInstitutes();
    } catch (err: any) {
      setUnivRegisterMsg({ text: err.message || 'Failed to register university.', error: true });
    } finally {
      setIsRegisteringUniv(false);
    }
  };

  // Open Dossier in Viewer Portal
  const handleOpenDossier = async (inst: Institute) => {
    setSelectedInstitute(inst);
    setIsLoadingStats(true);
    setInstituteStats(null);
    try {
      const stats = await fetchInstituteStats(inst.id);
      setInstituteStats(stats);
    } catch (err: any) {
      setInstituteStats({
        institute_id: inst.id,
        institute_name: inst.name,
        sample_size: 0,
        has_sufficient_data: false,
        status: 'insufficient_data',
        message: 'No approved submissions registered yet. Be the first to submit a verified receipt!',
        conversion_rate_percent: null,
        qualified_count: null,
        average_fee_paid: null,
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Submit Proof Form Handler
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFile || !scorecardFile) {
      setSubmitErrorMsg('Please upload both the Fee Receipt and Official Board Scorecard.');
      return;
    }
    if (!submissionForm.institute_id) {
      setSubmitErrorMsg('Please select a registered university.');
      return;
    }

    setSubmittingProof(true);
    setSubmitErrorMsg(null);
    setSubmitSuccessMsg(null);

    try {
      const resp = await submitProof({
        ...submissionForm,
        receipt_file: receiptFile,
        scorecard_file: scorecardFile,
      });
      setSubmitSuccessMsg(`Proof successfully submitted! Tracking ID: ${resp.id}. ${resp.message}`);
      setReceiptFile(null);
      setScorecardFile(null);
    } catch (err: any) {
      setSubmitErrorMsg(err.message || 'Failed to submit proof. Check file format and size.');
    } finally {
      setSubmittingProof(false);
    }
  };

  // Student Deletion Handler
  const handleDeleteRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletionId.trim()) return;
    setIsDeleting(true);
    setDeletionStatus(null);
    try {
      const resp = await requestSubmissionDeletion(deletionId.trim());
      setDeletionStatus(resp.message || 'Submission deleted successfully.');
      setDeletionId('');
    } catch (err: any) {
      setDeletionStatus(err.message || 'Error deleting record. Ensure ID is correct.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Admin / University Queue Login & Data
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    setAdminError(null);
    try {
      const resp = await adminLogin({ email: adminEmail, password: adminPassword });
      setAdminToken(resp.access_token);
      loadAdminQueue(resp.access_token);
    } catch (err: any) {
      setAdminError(err.message || 'Invalid admin credentials.');
    } finally {
      setAdminLoading(false);
    }
  };

  const loadAdminQueue = async (token: string) => {
    setAdminLoading(true);
    try {
      const [subs, logs] = await Promise.all([
        adminGetSubmissions({ status: 'all', token }),
        adminGetLogs(token),
      ]);
      setAdminSubmissions(subs);
      setAdminLogs(logs);
    } catch (err: any) {
      setAdminError(err.message || 'Failed to load verification queue.');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleFetchSignedUrls = async (id: string) => {
    if (!adminToken) return;
    try {
      const urls = await adminGetDocumentUrls(id, adminToken);
      setSignedUrls((prev) => ({ ...prev, [id]: urls }));
    } catch (err: any) {
      alert('Failed to generate signed document URLs: ' + err.message);
    }
  };

  const handleApprove = async (id: string) => {
    if (!adminToken) return;
    try {
      await adminApproveSubmission(id, adminToken);
      loadAdminQueue(adminToken);
    } catch (err: any) {
      alert('Error approving submission: ' + err.message);
    }
  };

  const handleReject = async (id: string) => {
    if (!adminToken || !rejectReason.trim()) return;
    try {
      await adminRejectSubmission(id, rejectReason.trim(), adminToken);
      setRejectPromptId(null);
      setRejectReason('');
      loadAdminQueue(adminToken);
    } catch (err: any) {
      alert('Error rejecting submission: ' + err.message);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#030712] text-slate-100 flex flex-col selection:bg-sky-500/30 selection:text-sky-200">
      {/* Top Header */}
      <header className="fixed top-0 w-full z-40 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 transition-all">
        <div className="h-16 max-w-7xl mx-auto px-6 flex items-center justify-between">
          <button onClick={() => setActivePortal('select')} className="flex items-center gap-3 group text-left">
            <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-sky-400/40 shadow-[0_0_15px_rgba(56,189,248,0.25)] group-hover:border-sky-400 transition-colors bg-slate-900 flex items-center justify-center p-0.5">
              <span className="material-symbols-outlined text-sky-400 text-xl font-bold">verified_user</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tracking-tight text-white font-headline">
                Result<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-teal-300">Proof</span>
              </span>
              <span className="text-[10px] font-semibold tracking-widest text-sky-400 uppercase bg-sky-950/80 border border-sky-800/50 px-1.5 py-0.5 rounded">
                Protocol
              </span>
            </div>
          </button>

          {/* Portal Switcher Tabs */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActivePortal('university')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activePortal === 'university'
                  ? 'bg-gradient-to-r from-sky-500/20 to-teal-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">account_balance</span>
              <span>University Portal</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-sky-400 font-mono">
                {institutes.length}/4
              </span>
            </button>

            <button
              onClick={() => setActivePortal('viewer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activePortal === 'viewer'
                  ? 'bg-gradient-to-r from-sky-500/20 to-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">travel_explore</span>
              <span>Viewer Portal</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-xs text-slate-400 hover:text-red-300 transition-colors hidden sm:inline"
            >
              Right to Deletion
            </button>
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-gradient-to-r from-sky-400 to-teal-300 rounded-lg shadow-[0_0_15px_rgba(56,189,248,0.3)] hover:opacity-95 transition-all"
            >
              Submit Proof
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full flex-grow pt-16 relative">
        <ShaderCanvas />

        {/* ========================================================================= */}
        {/* VIEW 1: PORTAL SELECTION (LANDING SCREEN) */}
        {/* ========================================================================= */}
        {activePortal === 'select' && (
          <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-sky-500/30 text-sky-300 text-xs font-semibold tracking-wide backdrop-blur-md mb-8 shadow-[0_0_15px_rgba(56,189,248,0.15)] animate-pulse">
                <span className="w-2 h-2 rounded-full bg-sky-400 inline-block"></span>
                <span>ZERO-AD AUDIT • REAL STUDENT PROOF • NO DEMO DATA</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight mb-4 font-headline">
                Choose Your Gateway to
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-indigo-400">
                  Cryptographic Verification
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl font-normal leading-relaxed mb-12">
                Eliminate unverified marketing claims. Select whether you are an authorized university registrar or a prospective student/viewer.
              </p>

              {/* Two Direct Gateway Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl text-left">
                {/* Option 1: University Portal */}
                <div
                  onClick={() => setActivePortal('university')}
                  className="group relative cursor-pointer bg-slate-900/80 border border-slate-800 hover:border-sky-500/60 p-8 rounded-2xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(56,189,248,0.15)] flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-sky-400 text-2xl">account_balance</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-2xl font-bold text-white font-headline">University Portal</h2>
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                        {institutes.length} / 4 Slots
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
                      For Universities &amp; Institutes. Register your university (strictly limited to 4 universities) and inspect verified student audit submissions.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-sky-400 group-hover:text-sky-300">
                    <span>Enter University Portal</span>
                    <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </div>
                </div>

                {/* Option 2: Viewer Portal */}
                <div
                  onClick={() => setActivePortal('viewer')}
                  className="group relative cursor-pointer bg-slate-900/80 border border-slate-800 hover:border-teal-500/60 p-8 rounded-2xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(20,184,166,0.15)] flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-teal-400 text-2xl">travel_explore</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-2xl font-bold text-white font-headline">Viewer Portal</h2>
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                        Public Audits
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
                      For Students, Parents &amp; Researchers. Search audited universities, inspect real qualification percentages (&ge;5 rule), and submit fee receipts.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-teal-400 group-hover:text-teal-300">
                    <span>Enter Viewer Portal</span>
                    <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: UNIVERSITY PORTAL (Strict 4 Universities Limit) */}
        {/* ========================================================================= */}
        {activePortal === 'university' && (
          <section className="px-6 py-12 max-w-7xl mx-auto w-full relative z-10 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-slate-800 gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-wider mb-2">
                  <span className="material-symbols-outlined text-base">account_balance</span>
                  <span>University Administration Protocol</span>
                </div>
                <h1 className="text-3xl font-bold text-white font-headline">University Registry</h1>
                <p className="text-slate-400 text-sm mt-1">
                  Add your university to the decentralized verification protocol (Strictly capped at 4 universities).
                </p>
              </div>

              {/* Slot Counter Pill */}
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center gap-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Capacity Status</span>
                  <span className="text-xl font-bold font-mono text-white">
                    {institutes.length} <span className="text-slate-500 text-sm">/ 4 Universities</span>
                  </span>
                </div>
                <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-sky-400 to-teal-400 h-full rounded-full transition-all"
                    style={{ width: `${(institutes.length / 4) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: University Registration Form */}
              <div className="lg:col-span-1">
                <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl backdrop-blur-md">
                  <h3 className="text-lg font-bold text-white mb-2 font-headline flex items-center gap-2">
                    <span className="material-symbols-outlined text-sky-400 text-xl">add_business</span>
                    <span>Register a University</span>
                  </h3>
                  <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                    {institutes.length < 4
                      ? `Slot ${institutes.length + 1} of 4 is currently available for enrollment.`
                      : 'All 4 university slots are currently filled.'}
                  </p>

                  {univRegisterMsg && (
                    <div
                      className={`p-3 rounded-xl text-xs mb-4 ${
                        univRegisterMsg.error
                          ? 'bg-red-950/60 border border-red-500/40 text-red-300'
                          : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                      }`}
                    >
                      {univRegisterMsg.text}
                    </div>
                  )}

                  {institutes.length < 4 ? (
                    <form onSubmit={handleRegisterUniversity} className="space-y-4 text-xs">
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">University / Institute Name</label>
                        <input
                          type="text"
                          value={newUnivName}
                          onChange={(e) => setNewUnivName(e.target.value)}
                          placeholder="e.g. Apex Science Academy"
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">City / Location</label>
                        <input
                          type="text"
                          value={newUnivCity}
                          onChange={(e) => setNewUnivCity(e.target.value)}
                          placeholder="e.g. Kota, Rajasthan"
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Offered Exams / Programs</label>
                        <input
                          type="text"
                          value={newUnivExams}
                          onChange={(e) => setNewUnivExams(e.target.value)}
                          placeholder="e.g. JEE, NEET, UPSC (comma separated)"
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-sky-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isRegisteringUniv}
                        className="w-full py-2.5 bg-gradient-to-r from-sky-400 to-teal-300 text-slate-950 font-bold rounded-lg hover:opacity-95 transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)]"
                      >
                        {isRegisteringUniv ? 'Enrolling University...' : `Enroll University (${institutes.length + 1}/4)`}
                      </button>
                    </form>
                  ) : (
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center text-xs text-amber-300">
                      <span className="material-symbols-outlined text-2xl text-amber-400 mb-1">lock</span>
                      <p className="font-semibold">Capacity Reached</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        4 out of 4 university profiles have been registered.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Registered Universities & Verification Queue */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 font-headline flex items-center justify-between">
                    <span>Enrolled Universities ({institutes.length}/4)</span>
                    <button
                      onClick={loadInstitutes}
                      className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-normal"
                    >
                      <span className="material-symbols-outlined text-sm">refresh</span>
                      <span>Refresh</span>
                    </button>
                  </h3>

                  {institutes.length === 0 ? (
                    <div className="p-8 bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
                      <span className="material-symbols-outlined text-3xl text-slate-600 mb-2">domain_disabled</span>
                      <p className="font-semibold text-slate-300">No universities enrolled yet.</p>
                      <p className="mt-1">Fill out the form on the left to add the first university.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {institutes.map((inst, idx) => (
                        <div
                          key={inst.id}
                          className="bg-slate-900/80 border border-slate-800 hover:border-sky-500/40 p-5 rounded-2xl flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                                University #{idx + 1}
                              </span>
                              <span className="text-[11px] text-slate-400">{inst.city}</span>
                            </div>
                            <h4 className="text-base font-bold text-white font-headline mb-2">{inst.name}</h4>
                            <div className="flex flex-wrap gap-1 mb-4">
                              {inst.exams.map((ex) => (
                                <span
                                  key={ex}
                                  className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800"
                                >
                                  {ex}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                            <button
                              onClick={() => {
                                setSelectedInstitute(inst);
                                handleOpenDossier(inst);
                              }}
                              className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                            >
                              <span>View Dossier</span>
                              <span className="material-symbols-outlined text-[14px]">arrow_outward</span>
                            </button>
                            <button
                              onClick={() => {
                                setSubmissionForm((prev) => ({ ...prev, institute_id: inst.id }));
                                setIsSubmitModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold"
                            >
                              + Add Proof
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submissions Review Console */}
                <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-white font-headline flex items-center gap-2">
                      <span className="material-symbols-outlined text-teal-400 text-lg">fact_check</span>
                      <span>Auditor Verification Console</span>
                    </h3>
                    {adminToken && (
                      <button onClick={() => loadAdminQueue(adminToken)} className="text-xs text-sky-400 hover:text-sky-300">
                        Refresh Queue
                      </button>
                    )}
                  </div>

                  {!adminToken ? (
                    <form onSubmit={handleAdminLogin} className="space-y-3 text-xs max-w-md">
                      <p className="text-slate-400 leading-relaxed">
                        Sign in as university auditor to approve student proof or inspect signed documents.
                      </p>
                      {adminError && <div className="p-2 bg-red-950 text-red-300 rounded">{adminError}</div>}
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="email"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          placeholder="admin@resultproof.org"
                          required
                          className="bg-slate-950 border border-slate-800 p-2 rounded text-white"
                        />
                        <input
                          type="password"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="Password"
                          required
                          className="bg-slate-950 border border-slate-800 p-2 rounded text-white"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={adminLoading}
                        className="px-4 py-2 bg-sky-500 text-slate-950 font-bold rounded hover:bg-sky-400"
                      >
                        {adminLoading ? 'Signing in...' : 'Sign In as Auditor'}
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-3 text-xs">
                      {adminSubmissions.length === 0 ? (
                        <p className="text-slate-400 py-4 text-center">No student submissions submitted yet.</p>
                      ) : (
                        adminSubmissions.map((sub) => (
                          <div key={sub.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">
                                {sub.exam} ({sub.year}) — {sub.result_value}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                                  sub.status === 'approved'
                                    ? 'bg-emerald-950 text-emerald-300'
                                    : sub.status === 'rejected'
                                    ? 'bg-red-950 text-red-300'
                                    : 'bg-sky-950 text-sky-300'
                                }`}
                              >
                                {sub.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Fee: ₹{sub.fee_paid} • Tracking ID: {sub.id} • Hash: {sub.receipt_hash.slice(0, 8)}...
                            </div>
                            {sub.status === 'pending' && (
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={() => handleApprove(sub.id)}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px]"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => setRejectPromptId(sub.id)}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-[11px]"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                            {rejectPromptId === sub.id && (
                              <div className="flex gap-2 pt-1">
                                <input
                                  type="text"
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  placeholder="Rejection reason..."
                                  className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white"
                                />
                                <button
                                  onClick={() => handleReject(sub.id)}
                                  className="px-3 py-1 bg-red-600 text-white font-bold rounded text-[11px]"
                                >
                                  Confirm
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: VIEWER PORTAL (Public Audits & Dossiers) */}
        {/* ========================================================================= */}
        {activePortal === 'viewer' && (
          <section className="px-6 py-12 max-w-7xl mx-auto w-full relative z-10 animate-fadeIn">
            <div className="mb-10 text-center max-w-3xl mx-auto">
              <span className="text-xs font-bold tracking-widest text-teal-400 uppercase bg-teal-950/60 border border-teal-800/40 px-3 py-1 rounded-full inline-block mb-3">
                Viewer &amp; Student Portal
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold text-white font-headline mb-3">
                Zero-Bias University Dossiers
              </h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                Explore verified qualification metrics from enrolled universities. Conversion rates are published strictly after 5 verified submissions.
              </p>
            </div>

            {/* Search Bar */}
            <div className="w-full max-w-2xl mx-auto backdrop-blur-xl bg-slate-900/80 border border-slate-800 p-2 rounded-2xl mb-12 flex flex-col sm:flex-row items-center gap-2">
              <div className="flex items-center gap-3 px-3.5 w-full sm:w-8/12 h-11 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="material-symbols-outlined text-teal-400 text-lg">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search university or city..."
                  className="w-full bg-transparent text-xs text-white placeholder-slate-400 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 px-3 w-full sm:w-4/12 h-11 bg-slate-950/80 rounded-xl border border-slate-800">
                <select
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
                >
                  <option className="bg-slate-900 text-white" value="">All Exams</option>
                  <option className="bg-slate-900 text-white" value="jee">JEE</option>
                  <option className="bg-slate-900 text-white" value="neet">NEET</option>
                  <option className="bg-slate-900 text-white" value="upsc">UPSC</option>
                </select>
              </div>
            </div>

            {/* Institutes Grid */}
            {institutes.length === 0 ? (
              <div className="p-12 bg-slate-900/60 border border-dashed border-slate-800 rounded-3xl text-center max-w-lg mx-auto">
                <span className="material-symbols-outlined text-4xl text-slate-600 mb-3">school</span>
                <h3 className="text-lg font-bold text-white mb-2 font-headline">No Universities Registered Yet</h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Universities can enroll up to 4 slots in the University Portal to start receiving and auditing student proofs.
                </p>
                <button
                  onClick={() => setActivePortal('university')}
                  className="px-5 py-2.5 bg-gradient-to-r from-sky-400 to-teal-300 text-slate-950 font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(56,189,248,0.3)]"
                >
                  Go to University Portal →
                </button>
              </div>
            ) : filteredInstitutes.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-10">No registered universities match your search query.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInstitutes.map((inst) => (
                  <div
                    key={inst.id}
                    className="bg-slate-900/80 border border-slate-800 hover:border-teal-500/50 rounded-2xl overflow-hidden p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex flex-wrap gap-1">
                          {inst.exams.map((ex) => (
                            <span
                              key={ex}
                              className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold px-2 py-0.5 rounded"
                            >
                              {ex}
                            </span>
                          ))}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">{inst.city}</span>
                      </div>

                      <h3 className="text-xl font-bold text-white font-headline leading-tight mb-4">
                        {inst.name}
                      </h3>

                      <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 mb-4">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                          Audit Verification Status
                        </span>
                        <div className="text-xs text-amber-300 flex items-center gap-1 font-semibold">
                          <span className="material-symbols-outlined text-sm">info</span>
                          <span>Strict &lt;5 Rule Active (Real Data Only)</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                      <button
                        onClick={() => handleOpenDossier(inst)}
                        className="font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
                      >
                        <span>Inspect Dossier</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_outward</span>
                      </button>
                      <button
                        onClick={() => {
                          setSubmissionForm((prev) => ({ ...prev, institute_id: inst.id }));
                          setIsSubmitModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-semibold"
                      >
                        Submit Proof
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full bg-slate-950 border-t border-slate-800/80 py-6 mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sky-400 text-base">verified</span>
            <span>ResultProof Protocol • Real Student Audits • No Demo Data</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setActivePortal('university')} className="hover:text-sky-400">
              University Portal (Max 4)
            </button>
            <button onClick={() => setActivePortal('viewer')} className="hover:text-teal-400">
              Viewer Portal
            </button>
            <button onClick={() => setIsDeleteModalOpen(true)} className="hover:text-red-400">
              Right to Deletion
            </button>
          </div>
        </div>
      </footer>

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL 1: INSTITUTE DOSSIER MODAL (<5 Sample Size Rule) */}
      {/* -------------------------------------------------------------------------- */}
      {selectedInstitute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-teal-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setSelectedInstitute(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>

            <div className="flex items-center gap-2 text-xs font-semibold text-teal-400 uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-base">verified</span>
              <span>Official Verified Audit Dossier</span>
            </div>

            <h2 className="text-2xl font-bold text-white mb-1 font-headline">{selectedInstitute.name}</h2>
            <p className="text-xs text-slate-400 mb-6">
              {selectedInstitute.city} • Verified Programs: {selectedInstitute.exams.join(', ')}
            </p>

            {isLoadingStats ? (
              <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
                Auditing cryptographic receipts from store...
              </div>
            ) : instituteStats ? (
              <div>
                {!instituteStats.has_sufficient_data ? (
                  <div className="bg-amber-950/50 border border-amber-500/40 rounded-xl p-5 mb-6 text-amber-200">
                    <div className="flex items-center gap-2 font-bold text-sm mb-2 text-amber-300">
                      <span className="material-symbols-outlined text-lg">warning</span>
                      <span>INSUFFICIENT SAMPLE SIZE (n &lt; 5)</span>
                    </div>
                    <p className="text-xs leading-relaxed text-amber-200/90">
                      {instituteStats.message ||
                        'ResultProof requires at least 5 verified student receipts to publish statistics. This rule prevents marketing manipulation and statistical distortion.'}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 font-mono text-xs bg-amber-950/80 px-2.5 py-1 rounded border border-amber-600/40 text-amber-300">
                      <span>Verified Submissions: n = {instituteStats.sample_size}</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-center">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                          Audited Conversion
                        </span>
                        <span className="text-2xl font-bold font-mono text-teal-400">
                          {instituteStats.conversion_rate_percent}%
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          n = {instituteStats.sample_size}
                        </span>
                      </div>
                      <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-center">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                          Qualified Scores
                        </span>
                        <span className="text-2xl font-bold font-mono text-emerald-400">
                          {instituteStats.qualified_count}
                        </span>
                      </div>
                      <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-center">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                          Average Fee Paid
                        </span>
                        <span className="text-xl font-bold font-mono text-white">
                          ₹{instituteStats.average_fee_paid ? (instituteStats.average_fee_paid / 1000).toFixed(0) + 'k' : '0'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedInstitute(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL 2: SUBMIT STUDENT PROOF MODAL (Multipart Upload + Zero-PII) */}
      {/* -------------------------------------------------------------------------- */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-xl bg-slate-900 border border-sky-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[92vh]">
            <button
              onClick={() => setIsSubmitModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>

            <div className="flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-base">lock</span>
              <span>Encrypted Student Proof Submission</span>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2 font-headline">Submit Verification Documents</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              We never collect or store student names, phone numbers, or email addresses. Uploaded documents are saved privately and automatically purged after 30 days.
            </p>

            {submitSuccessMsg && (
              <div className="mb-5 p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs">
                <span className="font-bold block mb-1">✓ Success</span>
                {submitSuccessMsg}
              </div>
            )}

            {submitErrorMsg && (
              <div className="mb-5 p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
                <span className="font-bold block mb-1">⚠ Notice</span>
                {submitErrorMsg}
              </div>
            )}

            {institutes.length === 0 ? (
              <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl text-center text-xs text-amber-300">
                Please register at least one university in the University Portal before submitting proof.
              </div>
            ) : (
              <form onSubmit={handleSubmitProof} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target University</label>
                  <select
                    value={submissionForm.institute_id}
                    onChange={(e) => setSubmissionForm({ ...submissionForm, institute_id: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-sky-500"
                  >
                    <option value="">-- Select Registered University --</option>
                    {institutes.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Exam / Program</label>
                    <input
                      type="text"
                      value={submissionForm.exam}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, exam: e.target.value })}
                      placeholder="e.g. JEE Advanced"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Year</label>
                    <input
                      type="number"
                      value={submissionForm.year}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, year: parseInt(e.target.value) || 2024 })}
                      min={2018}
                      max={2030}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Course Format</label>
                    <select
                      value={submissionForm.course_type}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, course_type: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-sky-500"
                    >
                      <option value="Classroom">Classroom</option>
                      <option value="Online">Online / Live</option>
                      <option value="DLP">Distance Learning (DLP)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Fee Paid (INR)</label>
                    <input
                      type="number"
                      value={submissionForm.fee_paid}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, fee_paid: parseFloat(e.target.value) || 0 })}
                      min={0}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Official Result / Score / Rank</label>
                  <input
                    type="text"
                    value={submissionForm.result_value}
                    onChange={(e) => setSubmissionForm({ ...submissionForm, result_value: e.target.value })}
                    placeholder="e.g. AIR 352, Qualified, 99.4 Percentile, or Not Qualified"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="border border-dashed border-slate-700 hover:border-sky-500/60 p-3 rounded-xl bg-slate-950/60 text-center">
                    <span className="material-symbols-outlined text-sky-400 text-2xl mb-1">receipt</span>
                    <span className="block font-semibold text-slate-300">Fee Receipt</span>
                    <span className="block text-[10px] text-slate-500 mb-2">PDF / JPG / PNG (Max 5MB)</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      required
                      className="text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-sky-500/20 file:text-sky-300"
                    />
                  </div>

                  <div className="border border-dashed border-slate-700 hover:border-teal-500/60 p-3 rounded-xl bg-slate-950/60 text-center">
                    <span className="material-symbols-outlined text-teal-400 text-2xl mb-1">badge</span>
                    <span className="block font-semibold text-slate-300">Scorecard</span>
                    <span className="block text-[10px] text-slate-500 mb-2">PDF / JPG / PNG (Max 5MB)</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setScorecardFile(e.target.files?.[0] || null)}
                      required
                      className="text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-teal-500/20 file:text-teal-300"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={submissionForm.consent_given}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, consent_given: e.target.checked })}
                      required
                      className="mt-0.5 rounded border-slate-700 text-sky-500 bg-slate-950"
                    />
                    <span className="text-[11px] text-slate-400 leading-snug">
                      I consent to the cryptographic audit of my proof with zero PII retention.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submittingProof}
                  className="w-full py-3 bg-gradient-to-r from-sky-400 to-teal-300 text-slate-950 font-bold rounded-xl shadow-[0_0_15px_rgba(56,189,248,0.3)] hover:opacity-95 transition-all flex items-center justify-center gap-2"
                >
                  {submittingProof ? 'Hashing & Submitting...' : 'Submit Real Proof'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL 3: STUDENT RIGHT TO DELETION */}
      {/* -------------------------------------------------------------------------- */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>

            <div className="flex items-center gap-2 text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-base">delete_forever</span>
              <span>Student Privacy Protocol</span>
            </div>

            <h3 className="text-xl font-bold text-white mb-2 font-headline">Request Record Deletion</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Enter your submission tracking ID to immediately purge your record and all uploaded files.
            </p>

            {deletionStatus && (
              <div className="mb-4 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-sky-300">
                {deletionStatus}
              </div>
            )}

            <form onSubmit={handleDeleteRequest} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Submission Tracking ID</label>
                <input
                  type="text"
                  value={deletionId}
                  onChange={(e) => setDeletionId(e.target.value)}
                  placeholder="e.g. sub_..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-red-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isDeleting}
                className="w-full py-2.5 bg-red-600/80 hover:bg-red-600 text-white font-bold rounded-lg transition-colors"
              >
                {isDeleting ? 'Deleting Record...' : 'Permanently Delete My Submission'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
