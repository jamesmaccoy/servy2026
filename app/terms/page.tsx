"use client";

import React from "react";
import { useAuth } from "@/components/auth";

export default function TermsPage() {
    const { user, loading } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 text-slate-800">
            <article className="max-w-4xl mx-auto bg-white p-6 sm:p-10 md:p-12 shadow-sm rounded-xl border border-slate-200">
                {/* Header */}
                <header className="border-b border-slate-200 pb-6 mb-8">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                        Terms of Use
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Simpleplek (Pty) Ltd. &bull; Last Updated: 2025
                    </p>
                </header>

                <div className="space-y-8 text-sm sm:text-base leading-relaxed text-slate-600">
                    {/* Section 1 */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">
                            1. Introduction
                        </h2>
                        <div className="space-y-4">
                            <p>
                                Welcome to Simpleplek. These Terms of Use (&quot;Terms&quot;) govern your access and use of our website, mobile applications, and all related services (the &quot;Platform&quot;) provided by Simpleplek (Pty) Ltd., a company registered in South Africa with CIPC Registration Number.
                            </p>
                            <p className="bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono text-xs sm:text-sm text-slate-700">
                                Simpleplek Memorandum of Incorporation (2025/880315/08)<br />
                                Rogerbaai, Cape Town, 7700
                            </p>
                            <p>
                                (hereinafter referred to as &quot;Simpleplek,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By accessing or using our Platform, you (&quot;User,&quot; &quot;Guest,&quot; or &quot;Member&quot;) agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you may not use the Platform.
                            </p>
                            <p className="italic text-slate-500 text-sm">
                                Note: When reviewing as a third party (for example SARS), these roles similarly extend: Beneficiary (user), Trustee (guest), as privileges are administered by the executor member.
                            </p>
                        </div>
                    </section>

                    {/* Section 2 */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">
                            2. Age Restriction
                        </h2>
                        <p>
                            The Simpleplek Platform is intended for use by individuals who are 18 years of age or older. By using this Platform, you represent and warrant that you are at least 18 years of age. You are prohibited from using this Platform to facilitate any website, application, or service that is directed toward or is likely to be accessed by individuals under the age of 18.
                        </p>
                    </section>

                    {/* Section 3 */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">
                            3. Simpleplek Membership Program
                        </h2>
                        <p className="mb-4">
                            Our Membership Program is a subscription service that offers exclusive benefits, including discounted rates and complimentary nights, as detailed on our website.
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Enrollment:</strong> To become a Member, you must complete the registration process and provide valid payment information.</li>
                            <li><strong>Payment:</strong> All subscription fees are billed in advance and are non-refundable, except as expressly stated in this Agreement or as required by law.</li>
                            <li><strong>Expiration and Cancellation:</strong> Memberships are fixed-term contracts. You may cancel your subscription in accordance with the cancellation policy specified in your membership agreement. In compliance with the South African Consumer Protection Act (CPA), you may be liable for a reasonable cancellation penalty if you terminate the contract early.</li>
                            <li><strong>Complimentary Nights:</strong> The use of complementary nights is subject to availability and specific terms outlined on the Platform.</li>
                        </ul>
                    </section>

                    {/* Section 4 */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">
                            4. Property Rentals and Reservations
                        </h2>
                        <div className="space-y-4">
                            <p>
                                <strong>Booking and Payment:</strong> All reservations for property rentals must be made through the Platform. To confirm a booking, you must make a full payment online. By providing your payment details, you authorize us to charge your credit card for the total rental fee.
                            </p>
                            <div>
                                <p className="font-semibold text-slate-900 mb-2">Cancellation Policy:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Full Refund:</strong> Cancellations made more than 30 days prior to the arrival date will receive a full refund.</li>
                                    <li><strong>Partial Refund:</strong> Cancellations made within 30 days of the arrival date will receive a 50% refund of the total rental fee.</li>
                                    <li><strong>No Refunds:</strong> No refunds will be given for cancellations made within 7 days of the arrival date or for no-shows.</li>
                                </ul>
                            </div>
                            <p>
                                <strong>Rescheduling:</strong> Rescheduling of a booking is permitted, subject to availability, provided the request is made more than 30 days prior to the original arrival date.
                            </p>
                        </div>
                    </section>

                    {/* Section 5 */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">
                            5. Guest Conduct and Property Rules
                        </h2>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <li className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <span className="font-semibold block text-slate-900 mb-1">Occupancy</span>
                                The maximum number of guests is specified in the property listing. Exceeding this limit is a breach of this Agreement.
                            </li>
                            <li className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <span className="font-semibold block text-slate-900 mb-1">Pet Policy</span>
                                The pet policy is determined by each property listing. No pets are allowed at properties with a &quot;No Pets&quot; policy.
                            </li>
                            <li className="bg-slate-50 p-4 rounded-lg border border-slate-100 border-l-4 border-l-amber-500">
                                <span className="font-semibold block text-slate-900 mb-1">Smoking Policy</span>
                                Smoking is strictly prohibited inside all properties. Any violation will result in an immediate penalty of ZAR 1,500, charged to the card on file.
                            </li>
                            <li className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <span className="font-semibold block text-slate-900 mb-1">Parking & Times</span>
                                Parking guidelines apply. Check-in and check-out times are specified in your booking confirmation.
                            </li>
                        </ul>
                        <p className="mt-4">
                            <strong>Property Care:</strong> Guests must use the property in a responsible manner, maintain a clean and tidy condition, and are responsible for any damage caused to the property or its contents during their stay.
                        </p>
                    </section>

                    {/* Section 6 */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">
                            6. Simpleplek&apos;s Role as an Intermediary
                        </h2>
                        <p className="mb-3">
                            Simpleplek is an online platform that acts as an intermediary connecting guests with property hosts (&quot;Hosts&quot;).
                        </p>
                        <p className="mb-3">
                            <strong>Host Responsibility:</strong> Hosts are solely responsible for the accuracy of their property listings, the condition of their properties, and the provision of services. This includes ensuring their properties comply with all applicable laws, including municipal bylaws and safety regulations.
                        </p>
                        <p className="p-4 bg-amber-50 text-amber-900 rounded-lg border border-amber-200 text-sm">
                            <strong>Disclaimer:</strong> Simpleplek does not own, manage, or control Third-Party Properties and disclaims any liability for their condition, safety, or legal compliance. Your use of these properties is at your own risk.
                        </p>
                    </section>

                    {/* Section 7 */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">
                            7. Prohibited Use and Legal Compliance
                        </h2>
                        <p className="mb-2">You agree not to use the Platform for any purpose that is prohibited by these Terms or applicable law, including:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Facilitating illegal activities or any use that violates municipal bylaws (e.g., operating an unlicensed rental or selling regulated substances like wine).</li>
                            <li>Attempting to reverse engineer, extract, or replicate any component of the Platform or its underlying technology.</li>
                            <li>Creating content or engaging in conduct that violates the Google API Prohibited Use Policy.</li>
                        </ul>
                    </section>

                    {/* Section 8 */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">
                            8. Disclaimers and Limitation of Liability
                        </h2>
                        <div className="space-y-3">
                            <p><strong>General Disclaimer:</strong> Simpleplek disclaims any liability for any loss or damage to your personal belongings during your stay at any property.</p>
                            <p><strong>Disclaimer of AI-Generated Content:</strong> If the Platform uses generative AI to provide content (e.g., travel itineraries, advice), you acknowledge that such content is for informational purposes only. The technology is experimental and may provide inaccurate information. Do not rely on such content for professional advice (including medical, legal, or financial advice).</p>
                            <p><strong>No Warranties:</strong> The Platform is provided on an &quot;as-is&quot; basis without warranties of any kind, either express or implied.</p>
                            <p><strong>Limitation of Liability:</strong> Simpleplek shall not be liable for any indirect, incidental, special, or consequential damages, except where caused by our gross negligence or willful misconduct.</p>
                        </div>
                    </section>

                    {/* Section 9 & 10 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 mb-2">9. Governing Law</h2>
                            <p className="text-sm">This Agreement shall be governed by and construed in accordance with the laws of the Republic of South Africa.</p>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 mb-2">10. Entire Agreement</h2>
                            <p className="text-sm">These Terms, together with our Privacy Policy and booking confirmations, constitute the entire agreement between you and Simpleplek.</p>
                        </div>
                    </div>

                    {/* Section 11 */}
                    <section className="pt-6 border-t border-slate-200">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">
                            11. Membership Tiers: Standard vs. Pro (Fractional Ownership)
                        </h2>
                        <p className="mb-4">
                            Simpleplek offers two distinct membership paths. By selecting a plan, the Member acknowledges the different legal nature of each:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="border border-slate-200 rounded-lg p-5 bg-white shadow-xs">
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">11.1 Standard Membership</h3>
                                <p className="text-xs uppercase font-bold text-slate-400 mb-3">Short-Term Access</p>
                                <ul className="space-y-2 text-sm">
                                    <li><strong>Nature:</strong> Month-to-month or annual service subscription for discounted rental access.</li>
                                    <li><strong>Rights:</strong> Provides no proprietary interest or equity.</li>
                                    <li><strong>Cancellation:</strong> Subject to a 30-day notice period.</li>
                                </ul>
                            </div>
                            <div className="border border-indigo-200 rounded-lg p-5 bg-indigo-50/40 shadow-xs">
                                <h3 className="text-lg font-semibold text-indigo-950 mb-2">11.2 Pro Membership</h3>
                                <p className="text-xs uppercase font-bold text-indigo-500 mb-3">Share Block / Leasehold Acquisition</p>
                                <ul className="space-y-2 text-sm text-indigo-950">
                                    <li><strong>Nature:</strong> Long-term capital acquisition program over a 25-year period.</li>
                                    <li><strong>Legal Status:</strong> Governed by the Share Block Control Act and Companies Act. Contributes toward Member Interest or Shareholder Equity.</li>
                                    <li><strong>Premiums:</strong> Includes an operational levy and a capital contribution toward long-term interest.</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Section 12 */}
                    <section className="bg-slate-100/70 p-6 rounded-xl border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-900 mb-3">
                            12. Pro Plan Cancellation & &quot;Member Credit&quot; System
                        </h2>
                        <p className="mb-4 text-sm">
                            Because the Pro Plan involves capital allocation within a property entity, the following &quot;Closed-Loop&quot; refund mechanism applies:
                        </p>
                        <div className="space-y-4 text-sm">
                            <div>
                                <h3 className="font-semibold text-slate-900">12.1 Cancellation and Redemption</h3>
                                <p>If a Pro Member cancels or defaults, they forfeit their specific claim to the underlying Sectional Title or 99-Year Leasehold. A reasonable cancellation penalty (max 10% of remaining contract value) applies under the CPA for admin and resale costs.</p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">12.2 Member Credits (Internal Accounting)</h3>
                                <p className="mb-2">Accumulated capital (premiums minus operational costs, interest, and VAT) converts to Member Credits on the internal registry.</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Nature:</strong> Internal accounting representation of &quot;Right of Use.&quot; Not crypto assets, not externally tradeable, no external wallet withdrawals.</li>
                                    <li><strong>Valuation:</strong> 1 Member Credit = ZAR 1.00 (for booking accommodation on Platform).</li>
                                    <li><strong>Transferability:</strong> Credits/Leasehold Balance are fully transferable via a formal Cession Agreement on the Platform.</li>
                                    <li><strong>No Cash Redemption:</strong> No cash buy-backs. Liquidity is provided solely via internal transfer/sale to other users.</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">12.3 Default and Reversion</h3>
                                <p>Failure to pay Pro Plan premiums for three consecutive months constitutes default. Interest reverts to the Entity, and remaining equity (after penalties) converts into Member Credits.</p>
                            </div>
                        </div>
                    </section>
                </div>
            </article>
        </div>
    );
}