import path from 'path';
import { getSimulator } from 'appium-ios-simulator';
import { createDevice, getDevices } from 'node-simctl';
import _ from 'lodash';
import log from './logger';


// returns true if sim is booted. false if not booted or doesnt exist
async function simBooted (sim) {
  let stat = await sim.stat();
  return stat.state === 'Booted';
}

// returns sim for desired caps
async function createSim (caps, sessionId) {
  let name = `appiumTest-${sessionId}`;
  let udid = await createDevice(name, caps.deviceName, caps.platformVersion);
  return await getSimulator(udid);
}

async function getExistingSim (deviceName, platformVersion) {
  let devices = await getDevices(platformVersion);
  for (let device of _.values(devices)) {
    if (device.name === deviceName) {
      return await getSimulator(device.udid);
    }
  }
  return null;
}

async function runSimulatorReset (device, opts) {
  if (opts.noReset && !opts.fullReset) {
    // noReset === true && fullReset === false
    log.debug('Reset: noReset is on. Leaving simulator as is');
    return;
  }

  if (!device) {
    log.debug('Reset: no device available. Skipping');
    return;
  }

  // The simulator process must be ended before we delete applications.
  await endSimulator(device);

  if (opts.fullReset) {
    // noReset === false && fullReset === true
    log.debug('Reset: fullReset is on. Cleaning simulator');
    await fullResetSimulator(device);
  } else {
    // noReset === false && fullReset === false
    log.debug(`Reset: fullReset is not on. Performing 'fast reset' by removing app resources`);
    await resetSimulator(device, opts);
  }
}

async function fullResetSimulator (device) {
  if (!device) return;

  await device.clean();
}

async function resetSimulator (device, opts) {
  if (!device || !opts.app || !opts.bundleId) return;

  try {
    await device.scrubCustomApp(path.basename(opts.app), opts.bundleId);
  } catch (err) {
    log.warn(err);
    log.warn('Reset: could not scrub application. Leaving as is.');
  }
}

async function endSimulator (device) {
  if (!device) return;

  log.debug('Reset: shutting down simulator');
  await device.shutdown();
}

async function isolateSimulatorDevice (device, isolateSimDevice = true) {
  if (isolateSimDevice) {
    await device.isolateSim();
  }
}


export { simBooted, createSim, getExistingSim, runSimulatorReset,
         isolateSimulatorDevice };
