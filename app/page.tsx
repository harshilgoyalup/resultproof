'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import {
  signInWithGoogle,
  logOut,
  subscribeToAuthChanges,
  isFirebaseConfigured,
  User,
  getFirebaseFirestore,
  collection,
  getDocs,
  setDoc,
  doc,
  addDoc,
} from '@/lib/firebase';

type PortalView = 'select' | 'university' | 'viewer';

export default function ResultProofApp() {
  // Navigation & Role State
  const [activePortal, setActivePortal] = useState<PortalView>('select');

  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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

  // University Auditor Console State
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

  // Firebase Auth Listener
  useEffect(() => {
    try {
      const unsubscribe = subscribeToAuthChanges((user) => {
        setCurrentUser(user);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firebase Auth listener note:', e);
    }
  }, []);

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setAuthError(err.message || 'Google sign in failed. Check Firebase settings in Vercel.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await logOut();
      setCurrentUser(null);
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  // Load universities from Firestore or API
  const loadInstitutes = async () => {
    setIsLoadingInstitutes(true);
    try {
      // Try loading from Firestore if configured
      const db = getFirebaseFirestore();
      if (db) {
        try {
          const snapshot = await getDocs(collection(db, 'institutes'));
          const firestoreInstitutes: Institute[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            firestoreInstitutes.push({
              id: docSnap.id,
              name: d.name,
              city: d.city,
              exams: d.exams || [],
              created_at: d.created_at || new Date().toISOString(),
            });
          });
          if (firestoreInstitutes.length > 0) {
            setInstitutes(firestoreInstitutes);
            if (!submissionForm.institute_id && firestoreInstitutes.length > 0) {
              setSubmissionForm((prev) => ({ ...prev, institute_id: firestoreInstitutes[0].id }));
            }
            setIsLoadingInstitutes(false);
            return;
          }
        } catch (fbErr) {
          console.warn('Firestore fetch note, falling back to API:', fbErr);
        }
      }

      // Fallback to Serverless API
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

      const univId = newUnivName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // Save to Firestore if configured
      const db = getFirebaseFirestore();
      if (db) {
        try {
          await setDoc(doc(db, 'institutes', univId), {
            name: newUnivName.trim(),
            city: newUnivCity.trim(),
            exams: examsArray.length > 0 ? examsArray : ['Academic Degree'],
            created_at: new Date().toISOString(),
            registered_by: currentUser?.email || 'user',
          });
        } catch (fbErr) {
          console.warn('Firestore write note:', fbErr);
        }
      }

      // Also register via API
      const created = await createInstitute({
        name: newUnivName.trim(),
        city: newUnivCity.trim(),
        exams: examsArray.length > 0 ? examsArray : ['Academic Degree'],
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
        message: 'No approved submissions registered yet. Submit the first verified receipt!',
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

      // Also save to Firestore if configured
      const db = getFirebaseFirestore();
      if (db) {
        try {
          await addDoc(collection(db, 'submissions'), {
            id: resp.id,
            institute_id: submissionForm.institute_id,
            exam: submissionForm.exam,
            year: submissionForm.year,
            course_type: submissionForm.course_type,
            fee_paid: submissionForm.fee_paid,
            result_value: submissionForm.result_value,
            status: 'pending',
            created_at: new Date().toISOString(),
          });
        } catch (fbErr) {
          console.warn('Firestore submission write note:', fbErr);
        }
      }

      setSubmitSuccessMsg(`Proof successfully submitted. Tracking ID: ${resp.id}. ${resp.message}`);
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

  // University Admin / Submissions Queue
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
      alert('Failed to generate document URLs: ' + err.message);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => setActivePortal('select')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
              RP
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight block leading-none font-headline">
                Result<span className="text-sky-700">Proof</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Academic Verification Registry</span>
            </div>
          </button>

          {/* Portal Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActivePortal('university')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activePortal === 'university'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-sm text-slate-700">account_balance</span>
              <span>University Portal</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-mono">
                {institutes.length}/4
              </span>
            </button>

            <button
              onClick={() => setActivePortal('viewer')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activePortal === 'viewer'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-sm text-sky-700">travel_explore</span>
              <span>Viewer Portal</span>
            </button>
          </div>

          {/* Right Header: Google Auth & Submit */}
          <div className="flex items-center gap-3">
            {/* Google Login Status */}
            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-5 h-5 rounded-full"
                  />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center font-bold text-[10px]">
                    {currentUser.email?.[0].toUpperCase()}
                  </span>
                )}
                <span className="font-medium text-slate-800 hidden sm:inline">
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-[11px] text-slate-500 hover:text-red-700 ml-1"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-all"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{authLoading ? 'Signing in...' : 'Google Login'}</span>
              </button>
            )}

            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all"
            >
              Submit Proof
            </button>
          </div>
        </div>
      </header>

      {/* Auth Error Banner */}
      {authError && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-center text-xs text-amber-800">
          <span>{authError}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="w-full flex-grow">
        {/* ========================================================================= */}
        {/* VIEW 1: PORTAL SELECTION (NATURAL WELCOME SCREEN) */}
        {/* ========================================================================= */}
        {activePortal === 'select' && (
          <div className="max-w-5xl mx-auto px-6 py-20 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
              <span>Independent Verification Registry • No Demo Data</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4 font-headline max-w-3xl mx-auto">
              Transparent Academic Verification for Universities &amp; Students
            </h1>

            <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed mb-12">
              ResultProof replaces marketing claims with verifiable fee receipts matched directly to official board scorecards.
            </p>

            {/* Two Portal Choice Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto text-left">
              {/* Option 1: University Portal */}
              <div
                onClick={() => setActivePortal('university')}
                className="card-clean card-clean-hover p-8 rounded-2xl cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-5 text-slate-800">
                    <span className="material-symbols-outlined text-2xl">account_balance</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold text-slate-900 font-headline">University Portal</h2>
                    <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {institutes.length} / 4 Registered
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    For university registrars and administration. Enroll your university (strictly limited to 4 universities) and inspect incoming verified student proof.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 hover:text-sky-700">
                  <span>Enter University Portal</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </div>
              </div>

              {/* Option 2: Viewer Portal */}
              <div
                onClick={() => setActivePortal('viewer')}
                className="card-clean card-clean-hover p-8 rounded-2xl cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center mb-5 text-sky-800">
                    <span className="material-symbols-outlined text-2xl">travel_explore</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold text-slate-900 font-headline">Viewer Portal</h2>
                    <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                      Public Registry
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed mb-6">
                    For prospective students, parents, and researchers. Search enrolled universities, audit real qualification rates, and submit student tuition proof.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-800 hover:text-sky-900">
                  <span>Enter Viewer Portal</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: UNIVERSITY PORTAL (Max 4 Capacity) */}
        {/* ========================================================================= */}
        {activePortal === 'university' && (
          <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-slate-200 gap-4">
              <div>
                <span className="text-xs font-bold tracking-wider text-slate-600 uppercase block mb-1">
                  Institutional Portal
                </span>
                <h1 className="text-3xl font-bold text-slate-900 font-headline">University Registry</h1>
                <p className="text-slate-600 text-sm mt-0.5">
                  Enroll your university in the verification registry (Strictly 4 universities limit).
                </p>
              </div>

              {/* Slot Indicator */}
              <div className="bg-white border border-slate-200 p-3 rounded-xl flex items-center gap-4 shadow-sm">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                    University Capacity
                  </span>
                  <span className="text-lg font-bold font-mono text-slate-900">
                    {institutes.length} <span className="text-slate-400 text-sm font-normal">/ 4 Slots Enrolled</span>
                  </span>
                </div>
                <div className="w-24 bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="bg-slate-900 h-full rounded-full transition-all"
                    style={{ width: `${(institutes.length / 4) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Form: Register University */}
              <div className="lg:col-span-1">
                <div className="card-clean p-6 rounded-2xl">
                  <h3 className="text-lg font-bold text-slate-900 mb-1 font-headline flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-700 text-xl">add_business</span>
                    <span>Register University</span>
                  </h3>
                  <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                    {institutes.length < 4
                      ? `Slot ${institutes.length + 1} of 4 is available for enrollment.`
                      : 'All 4 university slots have been filled.'}
                  </p>

                  {univRegisterMsg && (
                    <div
                      className={`p-3 rounded-xl text-xs mb-4 ${
                        univRegisterMsg.error
                          ? 'bg-red-50 border border-red-200 text-red-800'
                          : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      }`}
                    >
                      {univRegisterMsg.text}
                    </div>
                  )}

                  {institutes.length < 4 ? (
                    <form onSubmit={handleRegisterUniversity} className="space-y-4 text-xs">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">University Name</label>
                        <input
                          type="text"
                          value={newUnivName}
                          onChange={(e) => setNewUnivName(e.target.value)}
                          placeholder="e.g. Apex Science Academy"
                          required
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">City / Campus Location</label>
                        <input
                          type="text"
                          value={newUnivCity}
                          onChange={(e) => setNewUnivCity(e.target.value)}
                          placeholder="e.g. Kota, Rajasthan"
                          required
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Degrees / Programs Taught</label>
                        <input
                          type="text"
                          value={newUnivExams}
                          onChange={(e) => setNewUnivExams(e.target.value)}
                          placeholder="e.g. JEE, NEET, UPSC (comma separated)"
                          required
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isRegisteringUniv}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-all shadow-sm"
                      >
                        {isRegisteringUniv ? 'Enrolling University...' : `Enroll University (${institutes.length + 1}/4)`}
                      </button>
                    </form>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-700">
                      <span className="material-symbols-outlined text-2xl text-slate-500 mb-1">lock</span>
                      <p className="font-semibold">Capacity Reached</p>
                      <p className="text-[11px] text-slate-500 mt-1">4 out of 4 university profiles enrolled.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Enrolled Universities & Auditor Queue */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 font-headline flex items-center justify-between">
                    <span>Enrolled Universities ({institutes.length}/4)</span>
                    <button
                      onClick={loadInstitutes}
                      className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">refresh</span>
                      <span>Refresh</span>
                    </button>
                  </h3>

                  {institutes.length === 0 ? (
                    <div className="p-8 bg-white border border-dashed border-slate-300 rounded-2xl text-center text-slate-500 text-xs">
                      <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">school</span>
                      <p className="font-semibold text-slate-700">No universities enrolled yet.</p>
                      <p className="mt-1">Fill out the form on the left to add the first university.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {institutes.map((inst, idx) => (
                        <div key={inst.id} className="card-clean p-5 rounded-2xl flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                Slot #{idx + 1}
                              </span>
                              <span className="text-[11px] text-slate-500">{inst.city}</span>
                            </div>
                            <h4 className="text-base font-bold text-slate-900 font-headline mb-2">{inst.name}</h4>
                            <div className="flex flex-wrap gap-1 mb-4">
                              {inst.exams.map((ex) => (
                                <span
                                  key={ex}
                                  className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium"
                                >
                                  {ex}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                            <button
                              onClick={() => handleOpenDossier(inst)}
                              className="text-slate-900 hover:text-sky-700 font-semibold flex items-center gap-1"
                            >
                              <span>View Dossier</span>
                              <span className="material-symbols-outlined text-[14px]">arrow_outward</span>
                            </button>
                            <button
                              onClick={() => {
                                setSubmissionForm((prev) => ({ ...prev, institute_id: inst.id }));
                                setIsSubmitModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold border border-slate-200"
                            >
                              + Submit Proof
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submissions Review Panel */}
                <div className="card-clean p-6 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-900 font-headline flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-700 text-lg">fact_check</span>
                      <span>University Auditor Verification Console</span>
                    </h3>
                    {adminToken && (
                      <button onClick={() => loadAdminQueue(adminToken)} className="text-xs text-slate-600 hover:text-slate-900">
                        Refresh Queue
                      </button>
                    )}
                  </div>

                  {!adminToken ? (
                    <form onSubmit={handleAdminLogin} className="space-y-3 text-xs max-w-md">
                      <p className="text-slate-600 leading-relaxed">
                        Sign in as university auditor to approve student proof or inspect signed documents.
                      </p>
                      {adminError && <div className="p-2 bg-red-50 text-red-800 border border-red-200 rounded">{adminError}</div>}
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="email"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          placeholder="admin@resultproof.org"
                          required
                          className="bg-slate-50 border border-slate-300 p-2 rounded text-slate-900 outline-none"
                        />
                        <input
                          type="password"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="Password"
                          required
                          className="bg-slate-50 border border-slate-300 p-2 rounded text-slate-900 outline-none"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={adminLoading}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded shadow-sm"
                      >
                        {adminLoading ? 'Signing in...' : 'Sign In as Auditor'}
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-3 text-xs">
                      {adminSubmissions.length === 0 ? (
                        <p className="text-slate-500 py-4 text-center">No student submissions received yet.</p>
                      ) : (
                        adminSubmissions.map((sub) => (
                          <div key={sub.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">
                                {sub.exam} ({sub.year}) — {sub.result_value}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                                  sub.status === 'approved'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : sub.status === 'rejected'
                                    ? 'bg-red-100 text-red-800 border border-red-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {sub.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600">
                              Fee: ₹{sub.fee_paid} • Tracking ID: {sub.id}
                            </div>
                            {sub.status === 'pending' && (
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={() => handleApprove(sub.id)}
                                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded text-[11px]"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => setRejectPromptId(sub.id)}
                                  className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white font-bold rounded text-[11px]"
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
                                  className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900"
                                />
                                <button
                                  onClick={() => handleReject(sub.id)}
                                  className="px-3 py-1 bg-red-700 text-white font-bold rounded text-[11px]"
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
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: VIEWER PORTAL (Search & Verified Dossiers) */}
        {/* ========================================================================= */}
        {activePortal === 'viewer' && (
          <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="mb-8 text-center max-w-2xl mx-auto">
              <span className="text-xs font-bold tracking-wider text-slate-600 uppercase block mb-1">
                Public Verification Portal
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 font-headline mb-2">
                Enrolled Universities
              </h1>
              <p className="text-slate-600 text-sm leading-relaxed">
                Inspect verified qualification statistics. Real conversion rates are published after at least 5 verified submissions.
              </p>
            </div>

            {/* Search Bar */}
            <div className="w-full max-w-2xl mx-auto bg-white border border-slate-200 p-2 rounded-2xl mb-10 shadow-sm flex flex-col sm:flex-row items-center gap-2">
              <div className="flex items-center gap-3 px-3.5 w-full sm:w-8/12 h-11 bg-slate-50 rounded-xl border border-slate-200">
                <span className="material-symbols-outlined text-slate-400 text-lg">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search university name or city..."
                  className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 px-3 w-full sm:w-4/12 h-11 bg-slate-50 rounded-xl border border-slate-200">
                <select
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-700 outline-none cursor-pointer"
                >
                  <option value="">All Programs</option>
                  <option value="jee">JEE</option>
                  <option value="neet">NEET</option>
                  <option value="upsc">UPSC</option>
                </select>
              </div>
            </div>

            {/* Institutes Grid */}
            {institutes.length === 0 ? (
              <div className="p-12 bg-white border border-dashed border-slate-300 rounded-3xl text-center max-w-lg mx-auto shadow-sm">
                <span className="material-symbols-outlined text-4xl text-slate-400 mb-3">school</span>
                <h3 className="text-lg font-bold text-slate-900 mb-2 font-headline">No Universities Registered Yet</h3>
                <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                  Universities can enroll up to 4 slots in the University Portal to start receiving and auditing student proofs.
                </p>
                <button
                  onClick={() => setActivePortal('university')}
                  className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 shadow-sm"
                >
                  Go to University Portal →
                </button>
              </div>
            ) : filteredInstitutes.length === 0 ? (
              <p className="text-center text-slate-500 text-xs py-10">No registered universities match your search query.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInstitutes.map((inst) => (
                  <div
                    key={inst.id}
                    className="card-clean card-clean-hover rounded-2xl p-6 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex flex-wrap gap-1">
                          {inst.exams.map((ex) => (
                            <span
                              key={ex}
                              className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded"
                            >
                              {ex}
                            </span>
                          ))}
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">{inst.city}</span>
                      </div>

                      <h3 className="text-xl font-bold text-slate-900 font-headline leading-tight mb-4">
                        {inst.name}
                      </h3>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                        <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1 font-semibold">
                          Verification Status
                        </span>
                        <div className="text-xs text-slate-700 flex items-center gap-1 font-medium">
                          <span className="material-symbols-outlined text-sm text-amber-700">verified</span>
                          <span>Strict &lt;5 Threshold Active (Real Data Only)</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                      <button
                        onClick={() => handleOpenDossier(inst)}
                        className="font-semibold text-slate-900 hover:text-sky-700 flex items-center gap-1"
                      >
                        <span>View Dossier</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_outward</span>
                      </button>
                      <button
                        onClick={() => {
                          setSubmissionForm((prev) => ({ ...prev, institute_id: inst.id }));
                          setIsSubmitModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold shadow-sm"
                      >
                        Submit Proof
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-700 text-base">verified</span>
            <span>ResultProof Registry • Verified Tuition Receipts &amp; Scorecards</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setActivePortal('university')} className="hover:text-slate-900 font-medium">
              University Portal (Max 4)
            </button>
            <button onClick={() => setActivePortal('viewer')} className="hover:text-slate-900 font-medium">
              Viewer Portal
            </button>
            <button onClick={() => setIsDeleteModalOpen(true)} className="hover:text-red-700 font-medium">
              Right to Deletion
            </button>
          </div>
        </div>
      </footer>

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL 1: INSTITUTE DOSSIER MODAL (<5 Sample Size Rule) */}
      {/* -------------------------------------------------------------------------- */}
      {selectedInstitute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setSelectedInstitute(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>

            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Official Verified Audit Dossier
            </span>

            <h2 className="text-2xl font-bold text-slate-900 mb-1 font-headline">{selectedInstitute.name}</h2>
            <p className="text-xs text-slate-600 mb-6">
              {selectedInstitute.city} • Programs: {selectedInstitute.exams.join(', ')}
            </p>

            {isLoadingStats ? (
              <div className="py-10 text-center text-slate-500 text-xs">Loading audited statistics...</div>
            ) : instituteStats ? (
              <div>
                {!instituteStats.has_sufficient_data ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 text-amber-900">
                    <div className="flex items-center gap-2 font-bold text-sm mb-1 text-amber-900">
                      <span className="material-symbols-outlined text-lg text-amber-700">info</span>
                      <span>INSUFFICIENT SAMPLE SIZE (n &lt; 5)</span>
                    </div>
                    <p className="text-xs leading-relaxed text-amber-800">
                      {instituteStats.message ||
                        'ResultProof requires at least 5 verified student receipts to publish statistics. This rule prevents statistical distortion.'}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 font-mono text-xs bg-amber-100/80 px-2.5 py-1 rounded border border-amber-200 text-amber-900 font-semibold">
                      <span>Verified Submissions: n = {instituteStats.sample_size}</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1 font-semibold">
                        Conversion Rate
                      </span>
                      <span className="text-2xl font-bold font-mono text-slate-900">
                        {instituteStats.conversion_rate_percent}%
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        n = {instituteStats.sample_size}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1 font-semibold">
                        Qualified Scores
                      </span>
                      <span className="text-2xl font-bold font-mono text-emerald-700">
                        {instituteStats.qualified_count}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1 font-semibold">
                        Average Tuition
                      </span>
                      <span className="text-xl font-bold font-mono text-slate-900">
                        ₹{instituteStats.average_fee_paid ? (instituteStats.average_fee_paid / 1000).toFixed(0) + 'k' : '0'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedInstitute(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------- */}
      {/* MODAL 2: SUBMIT STUDENT PROOF MODAL */}
      {/* -------------------------------------------------------------------------- */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl overflow-y-auto max-h-[92vh]">
            <button
              onClick={() => setIsSubmitModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>

            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Encrypted Student Proof Submission
            </span>

            <h2 className="text-2xl font-bold text-slate-900 mb-2 font-headline">Submit Verification Documents</h2>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              We never collect or store student names, phone numbers, or email addresses. Uploaded documents are saved privately and automatically purged after 30 days.
            </p>

            {submitSuccessMsg && (
              <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                <span className="font-bold block mb-1">✓ Success</span>
                {submitSuccessMsg}
              </div>
            )}

            {submitErrorMsg && (
              <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                <span className="font-bold block mb-1">⚠ Notice</span>
                {submitErrorMsg}
              </div>
            )}

            {institutes.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-700">
                Please register at least one university in the University Portal before submitting proof.
              </div>
            ) : (
              <form onSubmit={handleSubmitProof} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Target University</label>
                  <select
                    value={submissionForm.institute_id}
                    onChange={(e) => setSubmissionForm({ ...submissionForm, institute_id: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
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
                    <label className="block text-slate-700 font-semibold mb-1">Exam / Program</label>
                    <input
                      type="text"
                      value={submissionForm.exam}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, exam: e.target.value })}
                      placeholder="e.g. JEE Advanced"
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Year</label>
                    <input
                      type="number"
                      value={submissionForm.year}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, year: parseInt(e.target.value) || 2024 })}
                      min={2018}
                      max={2030}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Course Format</label>
                    <select
                      value={submissionForm.course_type}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, course_type: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                    >
                      <option value="Classroom">Classroom</option>
                      <option value="Online">Online / Live</option>
                      <option value="DLP">Distance Learning (DLP)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Fee Paid (INR)</label>
                    <input
                      type="number"
                      value={submissionForm.fee_paid}
                      onChange={(e) => setSubmissionForm({ ...submissionForm, fee_paid: parseFloat(e.target.value) || 0 })}
                      min={0}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Official Result / Score / Rank</label>
                  <input
                    type="text"
                    value={submissionForm.result_value}
                    onChange={(e) => setSubmissionForm({ ...submissionForm, result_value: e.target.value })}
                    placeholder="e.g. AIR 352, Qualified, 99.4 Percentile, or Not Qualified"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="border border-dashed border-slate-300 p-3 rounded-xl bg-slate-50 text-center">
                    <span className="material-symbols-outlined text-slate-600 text-2xl mb-1">receipt</span>
                    <span className="block font-semibold text-slate-800">Fee Receipt</span>
                    <span className="block text-[10px] text-slate-500 mb-2">PDF / JPG / PNG (Max 5MB)</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      required
                      className="text-[11px] text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-slate-200 file:text-slate-800"
                    />
                  </div>

                  <div className="border border-dashed border-slate-300 p-3 rounded-xl bg-slate-50 text-center">
                    <span className="material-symbols-outlined text-slate-600 text-2xl mb-1">badge</span>
                    <span className="block font-semibold text-slate-800">Scorecard</span>
                    <span className="block text-[10px] text-slate-500 mb-2">PDF / JPG / PNG (Max 5MB)</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setScorecardFile(e.target.files?.[0] || null)}
                      required
                      className="text-[11px] text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-slate-200 file:text-slate-800"
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
                      className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span className="text-[11px] text-slate-600 leading-snug">
                      I consent to the audit of my proof with zero student personal data retention.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submittingProof}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm transition-all"
                >
                  {submittingProof ? 'Submitting...' : 'Submit Real Proof'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>

            <span className="text-xs font-bold text-red-700 uppercase tracking-wider block mb-1">
              Privacy &amp; Deletion
            </span>

            <h3 className="text-xl font-bold text-slate-900 mb-2 font-headline">Request Record Deletion</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Enter your submission tracking ID to immediately purge your record and all uploaded files.
            </p>

            {deletionStatus && (
              <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800">
                {deletionStatus}
              </div>
            )}

            <form onSubmit={handleDeleteRequest} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Submission Tracking ID</label>
                <input
                  type="text"
                  value={deletionId}
                  onChange={(e) => setDeletionId(e.target.value)}
                  placeholder="e.g. sub_..."
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-slate-900 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isDeleting}
                className="w-full py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-lg transition-colors"
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
