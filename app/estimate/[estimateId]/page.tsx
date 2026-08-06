import React from "react";
import { notFound } from "next/navigation";
import { getEstimate, getProperty, getPackage } from "@/lib/firebase";
import EstimateClient from "./EstimateClient";

interface PageProps {
  params: Promise<{ estimateId: string }>;
}

export default async function EstimatePage({ params }: PageProps) {
  const { estimateId } = await params;
  const estimate = await getEstimate(estimateId);

  if (!estimate) {
    notFound();
  }

  const property = await getProperty(estimate.propertyId);
  const selectedPackage = estimate.packageId ? await getPackage(estimate.packageId) : null;

  return (
    <EstimateClient 
      estimate={estimate} 
      property={property} 
      selectedPackage={selectedPackage} 
    />
  );
}
