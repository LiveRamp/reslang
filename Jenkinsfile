#!groovy

@Library('liveramp-base@v2')
import groovy.transform.Field

pipeline {
	agent {
		label 'jenkins-agent-ubuntu-2004-n1-standard-8'
	}

	environment {
		DOCKER_IMAGE = 'us-central1-docker.pkg.dev/liveramp-eng/shared/api/reslang'
		SHORT_SHA = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
	}

	stages {
		stage('Checkout') {
			steps {
				checkout scm
			}
		}

		stage('Install') {
			when {
				not {
					branch 'master'
				}
			}
			steps {
				script {
					sh 'yarn install'
				}
			}
		}

		stage('Test') {
			when {
				not {
					branch 'master'
				}
			}
			steps {
				script {
					sh 'yarn test'
				}
			}
		}

		stage('Build') {
			when {
				branch 'master'
			}
			steps {
				withCredentials([usernamePassword(credentialsId: 'svc-jenkins-docker-hub-creds', passwordVariable: 'DOCKER_TOKEN', usernameVariable: 'DOCKER_USERNAME')]) {
					script {
						sh 'mkdir -p ${WORKSPACE}/.docker-config'
						sh 'export DOCKER_CONFIG=${WORKSPACE}/.docker-config'
						sh 'echo ${DOCKER_TOKEN} | docker --config ${WORKSPACE}/.docker-config login -u ${DOCKER_USERNAME} --password-stdin'
						sh 'docker build -t ${DOCKER_IMAGE}:${SHORT_SHA} .'
						sh 'docker build -t ${DOCKER_IMAGE}:master .'
						sh 'docker logout'
						sh 'rm -rf ${WORKSPACE}/.docker-config'
					}
				}
			}
		}

		stage('Push') {
			when {
				branch 'master'
			}
			steps {
				script {
					withGCPServiceAccount('gcp-gcr--liveramp-jenkins') {
						sh 'docker push ${DOCKER_IMAGE}:${SHORT_SHA}'
						sh 'docker push ${DOCKER_IMAGE}:master'
					}
				}
			}
		}
	}

	options {
		timeout(time: 7, unit: 'MINUTES')
	}

	post {
		always {
			cleanWs()
		}
	}
}