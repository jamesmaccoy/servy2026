"use client";

import React from "react";
import { useAuth } from "@/components/auth";

export default function PrivacyPolicyPage() {
    const { user, loading } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 text-slate-800">
            <article className="max-w-4xl mx-auto bg-white p-6 sm:p-10 md:p-12 shadow-sm rounded-xl border border-slate-200">
                {/* Header */}
                <header className="border-b border-slate-200 pb-6 mb-8">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                        Privacy Policy
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Simpleplek (Pty) Ltd. &bull; Compliant with POPIA (South Africa)
                    </p>
                </header>

                <div className="space-y-8 text-sm sm:text-base leading-relaxed text-slate-600">
                    {/* Section 1 */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">
                            1. Introduction
                        </h2>
                        <div className="space-y-4">
                            <p className="bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono text-xs sm:text-sm text-slate-700">
                                Simpleplek Memorandum of Incorporation (2025/880315/08)<br />
                                Rogerbaai, Cape Town, 7700
                            </p>
                            <p>
                                (&quot;Simpleplek,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting the privacy and security of your personal information. This Privacy Policy outlines how we collect, use, store, and share your personal information and details your rights in relation to that information. We process all personal information in accordance with the Protection of Personal Information Act, 4 of 2013 (POPIA) of South Africa.
                            </p>
                        </div>
                    </section>

                    {/* Section 2 */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">
                            2. Information We Collect
                        </h2>
                        <p className="mb-4">
                            We collect personal information necessary to provide our services. This may include:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <span className="font-semibold block text-slate-900 mb-1">Identity Data</span>
                                Your name, surname, and identification number.
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <span className="font-semibold block text-slate-900 mb-1">Contact Data</span>
                                Your email address, phone number, and physical address.
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <span className="font-semibold block text-slate-900 mb-1">Financial Data</span>
                                Your payment details (e.g., credit card information) for processing transactions.
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <span className="font-semibold block text-slate-900 mb-1">Usage Data</span>
                                Information about how you use our Platform, including booking history and preferences.
                            </div>
                        </div>
                        <div className="mt-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <span className="font-semibold block text-slate-900 mb-1">Technical Data</span>
                            Your IP address, device type, browser information, and location data.
                        </div>
                    </section>

                    {/* Section 3 */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">
                            3. How and Why We Use Your Information
                        </h2>
                        <p className="mb-3">
                            We collect and process your personal information for the following purposes:
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>To Provide Services:</strong> To process your reservations, manage your membership, and facilitate communications between you and a Host.</li>
                            <li><strong>For Communication:</strong> To send you booking confirmations, membership updates, and service-related notifications.</li>
                            <li><strong>For Marketing:</strong> With your consent, to send you marketing communications about new properties, special offers, and promotions.</li>
                            <li><strong>For Legal Compliance:</strong> To comply with legal obligations and regulatory requirements, including those imposed by the Companies and Intellectual Property Commission (CIPC).</li>
                            <li><strong>To Improve Our Platform:</strong> To analyze usage data to improve the functionality and user experience of our Platform.</li>
                        </ul>
                    </section>

                    {/* Section 4 */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">
                            4. Data Handling and Google API Services
                        </h2>
                        <p className="mb-4">
                            We utilize third-party services, including Google&apos;s Gemini API, to enhance our Platform. Our data handling practices differ based on the type of Google service we use:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="border border-amber-200 rounded-lg p-5 bg-amber-50/40">
                                <h3 className="text-lg font-semibold text-amber-950 mb-2">Unpaid Services</h3>
                                <p className="text-xs text-amber-900/80">
                                    If you use our Platform and we are operating under an Unpaid Quota from Google&apos;s Gemini API, Google uses the content you submit (prompts, files, and generated responses) to provide, improve, and develop Google products, services, and machine learning technologies.
                                </p>
                                <p className="mt-3 text-xs font-semibold text-amber-900">
                                    &bull; Please do not submit sensitive, confidential, or personal information under this mode.
                                </p>
                            </div>
                            <div className="border border-slate-200 rounded-lg p-5 bg-slate-50">
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">Paid Services</h3>
                                <p className="text-xs text-slate-600">
                                    If we are operating under a Paid Quota from Google&apos;s Gemini API (Cloud Billing account), Google does not use your prompts or responses to improve its products. Google logs this data for a limited period solely to detect violations of its Prohibited Use Policy and for required legal or regulatory disclosures.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Section 5 */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">
                            5. How We Share Your Information
                        </h2>
                        <p className="mb-3">We may share your personal information with:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Hosts:</strong> We share your name, contact details, and reservation information with the Host of the property you have booked to facilitate your stay.</li>
                            <li><strong>Service Providers:</strong> We use third-party service providers, such as payment processors, to perform functions on our behalf. These providers are obligated to protect your information and may only use it for the specified purposes.</li>
                            <li><strong>Legal Authorities:</strong> We may disclose your information if required to do so by law or in response to a request from a government or regulatory body (e.g., CIPC, South African Police Service).</li>
                        </ul>
                    </section>

                    {/* Section 6 */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">
                            6. Data Security and Storage
                        </h2>
                        <p>
                            We implement reasonable technical and organizational security measures to protect your personal information from unauthorized access, loss, or misuse. We will only retain your personal information for as long as is necessary to fulfill the purposes for which it was collected or as required by law.
                        </p>
                    </section>

                    {/* Section 7 */}
                    <section className="bg-slate-100/70 p-6 rounded-xl border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-900 mb-3">
                            7. Your Rights Under POPIA
                        </h2>
                        <p className="mb-3 text-sm">
                            As a data subject under POPIA, you have the following rights:
                        </p>
                        <ul className="list-disc pl-5 space-y-2 text-sm mb-4">
                            <li><strong>Right to Access:</strong> Request access to the personal information we hold about you.</li>
                            <li><strong>Right to Correction:</strong> Request the correction of any inaccurate or incomplete information.</li>
                            <li><strong>Right to Deletion:</strong> Request the deletion or destruction of your personal information, subject to legal and contractual obligations.</li>
                            <li><strong>Right to Object:</strong> Object to the processing of your personal information on reasonable grounds relating to your particular situation.</li>
                        </ul>
                        <p className="text-xs text-slate-500 pt-3 border-t border-slate-200">
                            To exercise any of these rights, please contact our Information Officer at{" "}
                            <a href="mailto:privacy@simpleplek.co.za" className="text-indigo-600 underline font-medium">
                                privacy@simpleplek.co.za
                            </a>
                        </p>
                    </section>

                    {/* Section 8 */}
                    <section className="pt-4 border-t border-slate-200">
                        <h2 className="text-xl font-bold text-slate-900 mb-3">
                            8. Changes to this Privacy Policy
                        </h2>
                        <p>
                            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on our website. Your continued use of the Platform after the changes take effect constitutes your acceptance of the updated policy.
                        </p>
                    </section>
                </div>
            </article>
        </div>
    );
}