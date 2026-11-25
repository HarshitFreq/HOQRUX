import React from 'react';
import { Redirect } from 'expo-router';

export default function InstallRedirect() {
  return <Redirect href="/welcome" />;
}
